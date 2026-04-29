'use strict';

function parsePrometheusText(text, keys) {
    const result = {};
    for (const key of keys) {
        result[key] = undefined;
    }

    const lines = text.split('\n');
    for (const line of lines) {
        if (line.startsWith('#') || !line.trim()) continue;

        for (const key of keys) {
            if (result[key] !== undefined) continue;

            const prefix = key + '{';
            if (line.startsWith(prefix) || line.startsWith(key + ' ')) {
                const valueStart = line.lastIndexOf(' ');
                if (valueStart === -1) continue;

                const raw = line.substring(valueStart + 1).trim();
                const parsed = Number(raw);
                if (!isNaN(parsed) && isFinite(parsed)) {
                    result[key] = parsed;
                }
            }
        }
    }

    return result;
}

module.exports = { parsePrometheusText };
