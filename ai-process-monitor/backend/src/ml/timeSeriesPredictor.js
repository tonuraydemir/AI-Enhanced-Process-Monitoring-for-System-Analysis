const tf = require('@tensorflow/tfjs');

class LSTMPredictor {
    constructor(inputShape = 10, hiddenUnits = 50) {
        this.inputShape = inputShape;
        this.hiddenUnits = hiddenUnits;
        this.model = null;
        this.trained = false;
    }

    // Build LSTM model
    buildModel() {
        this.model = tf.sequential();

        // LSTM layers
        this.model.add(tf.layers.lstm({
            units: this.hiddenUnits,
            returnSequences: true,
            inputShape: [this.inputShape, 1]
        }));

        this.model.add(tf.layers.dropout({ rate: 0.2 }));

        this.model.add(tf.layers.lstm({
            units: this.hiddenUnits / 2,
            returnSequences: false
        }));

        this.model.add(tf.layers.dropout({ rate: 0.2 }));

        // Dense output layer
        this.model.add(tf.layers.dense({ units: 1 }));

        this.model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError',
            metrics: ['mae']
        });

        console.log('LSTM model built');
        this.model.summary();
    }

    // Prepare sequences for training
    prepareSequences(data, lookback = 10) {
        const X = [];
        const y = [];

        for (let i = 0; i < data.length - lookback; i++) {
            X.push(data.slice(i, i + lookback));
            y.push(data[i + lookback]);
        }

        return { X, y };
    }

    // Normalize data
    normalize(data) {
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;

        return {
            normalized: data.map(val => (val - min) / range),
            min,
            max
        };
    }

    denormalize(value, min, max) {
        return value * (max - min) + min;
    }

    // Train the model
    async train(data, epochs = 50, batchSize = 32) {
        if (!this.model) {
            this.buildModel();
        }

        // Normalize data
        const { normalized, min, max } = this.normalize(data);
        this.normParams = { min, max };

        // Prepare sequences
        const { X, y } = this.prepareSequences(normalized, this.inputShape);

        // Convert to tensors
        const xTensor = tf.tensor3d(X.map(seq => seq.map(val => [val])));
        const yTensor = tf.tensor2d(y.map(val => [val]));

        // Train
        console.log('Training LSTM model...');
        await this.model.fit(xTensor, yTensor, {
            epochs,
            batchSize,
            validationSplit: 0.2,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    if (epoch % 10 === 0) {
                        console.log(`Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, val_loss = ${logs.val_loss.toFixed(4)}`);
                    }
                }
            }
        });

        this.trained = true;
        console.log('LSTM training complete');

        // Cleanup
        xTensor.dispose();
        yTensor.dispose();
    }

    // Predict next value (fail-safe)
    async predict(sequence) {
        // Conservative default: return last known value (or 0)
        const last = Array.isArray(sequence) && sequence.length ? sequence[sequence.length - 1] : 0;
        if (!this.trained || !this.model || !this.normParams) {
            return last;
        }
        try {
            // Normalize input
            const normalized = sequence.map(val =>
                (val - this.normParams.min) / ((this.normParams.max - this.normParams.min) || 1)
            );

            // Convert to tensor
            const inputTensor = tf.tensor3d([normalized.map(val => [val])]);

            // Predict
            const prediction = this.model.predict(inputTensor);
            const value = await prediction.data();

            // Denormalize
            const denormalized = this.denormalize(
                value[0],
                this.normParams.min,
                this.normParams.max
            );

            // Cleanup
            inputTensor.dispose();
            prediction.dispose();

            return denormalized;
        } catch (e) {
            return last;
        }
    }

    // Predict multiple steps ahead (fail-safe)
    async predictMultiStep(sequence, steps = 5) {
        const last = Array.isArray(sequence) && sequence.length ? sequence[sequence.length - 1] : 0;
        if (!this.trained || !this.model || !this.normParams) {
            return Array(steps).fill(last);
        }

        const predictions = [];
        let currentSequence = [...sequence];

        for (let i = 0; i < steps; i++) {
            const window = currentSequence.slice(-this.inputShape);
            const nextValue = await this.predict(window);
            predictions.push(nextValue);
            currentSequence.push(nextValue);
        }

        return predictions;
    }

    // Save model
    async save(path) {
        if (this.model) {
            await this.model.save(`file://${path}`);
            console.log(`Model saved to ${path}`);
        }
    }

    // Load model
    async load(path) {
        this.model = await tf.loadLayersModel(`file://${path}/model.json`);
        this.trained = true;
        console.log(`Model loaded from ${path}`);
    }
}

module.exports = LSTMPredictor;