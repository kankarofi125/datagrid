export class MemoryBillsIdempotencyStore {
    map = new Map();
    async get(key) {
        return this.map.get(key);
    }
    async set(key, value) {
        this.map.set(key, value);
    }
    async setIfAbsent(key, value) {
        if (this.map.has(key))
            return false;
        this.map.set(key, value);
        return true;
    }
    async delete(key) {
        this.map.delete(key);
    }
    clear() {
        this.map.clear();
    }
}
//# sourceMappingURL=idempotency.js.map