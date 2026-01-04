const math = require('mathjs');

class IsolationForest {
    constructor(numTrees = 100, sampleSize = 256, contamination = 0.1) {
        this.numTrees = numTrees;
        this.sampleSize = sampleSize;
        this.contamination = contamination;
        this.trees = [];
        this.trained = false;
    }

    // Build isolation tree
    buildTree(data, currentDepth = 0, maxDepth = 10) {
        if (data.length <= 1 || currentDepth >= maxDepth) {
            return {
                type: 'leaf',
                size: data.length
            };
        }

        const numFeatures = data[0].length;
        const featureIndex = Math.floor(Math.random() * numFeatures);
        const featureValues = data.map(point => point[featureIndex]);

        const minVal = Math.min(...featureValues);
        const maxVal = Math.max(...featureValues);
        const splitValue = minVal + Math.random() * (maxVal - minVal);

        const leftData = data.filter(point => point[featureIndex] < splitValue);
        const rightData = data.filter(point => point[featureIndex] >= splitValue);

        if (leftData.length === 0 || rightData.length === 0) {
            return {
                type: 'leaf',
                size: data.length
            };
        }

        return {
            type: 'internal',
            featureIndex,
            splitValue,
            left: this.buildTree(leftData, currentDepth + 1, maxDepth),
            right: this.buildTree(rightData, currentDepth + 1, maxDepth)
        };
    }

    // Train the forest
    fit(data) {
        this.trees = [];
        const maxDepth = Math.ceil(Math.log2(this.sampleSize));

        for (let i = 0; i < this.numTrees; i++) {
            // Random sampling
            const sample = [];
            for (let j = 0; j < Math.min(this.sampleSize, data.length); j++) {
                const randomIndex = Math.floor(Math.random() * data.length);
                sample.push(data[randomIndex]);
            }

            const tree = this.buildTree(sample, 0, maxDepth);
            this.trees.push(tree);
        }

        this.trained = true;
        console.log(`Isolation Forest trained with ${this.numTrees} trees`);
    }

    // Calculate path length for a point
    pathLength(point, tree, currentDepth = 0) {
        if (tree.type === 'leaf') {
            // Average path length of unsuccessful search in BST
            const c = tree.size > 1 ? 2 * (Math.log(tree.size - 1) + 0.5772156649) - (2 * (tree.size - 1) / tree.size) : 0;
            return currentDepth + c;
        }

        if (point[tree.featureIndex] < tree.splitValue) {
            return this.pathLength(point, tree.left, currentDepth + 1);
        } else {
            return this.pathLength(point, tree.right, currentDepth + 1);
        }
    }

    // Predict anomaly score for a single point (fail-safe)
    predict(point) {
        // If not trained or no trees available yet, return non-anomalous default
        if (!this.trained || !Array.isArray(this.trees) || this.trees.length === 0) {
            return 0; // score 0 => normal
        }

        try {
            const avgPathLength = this.trees.reduce((sum, tree) => {
                return sum + this.pathLength(point, tree);
            }, 0) / this.numTrees;

            const c = 2 * (Math.log(this.sampleSize - 1) + 0.5772156649) - (2 * (this.sampleSize - 1) / this.sampleSize);
            const anomalyScore = Math.pow(2, -avgPathLength / c);

            return anomalyScore;
        } catch (e) {
            // On any unexpected error, degrade gracefully
            return 0;
        }
    }

    // Predict for multiple points
    predictBatch(data) {
        if (!Array.isArray(data)) return [];
        return data.map(point => this.predict(point));
    }
}

module.exports = IsolationForest;