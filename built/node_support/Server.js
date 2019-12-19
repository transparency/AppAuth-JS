"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Http = require("http");
var ServerHolder = /** @class */ (function () {
    function ServerHolder() {
        this.server = null;
    }
    ServerHolder.get = function () {
        console.log("is instance null: " + (ServerHolder.instance === null));
        if (!ServerHolder.instance) {
            ServerHolder.instance = new ServerHolder();
        }
        return ServerHolder.instance;
    };
    ServerHolder.prototype.createServer = function (httpServerPort, requestListener) {
        if (this.server === null) {
            try {
                this.server = Http.createServer(requestListener);
                this.server.listen(httpServerPort);
            }
            catch (e) {
                console.log(e);
            }
        }
        else {
            try {
                // @ts-ignore
                // this.server.removeListener('request');
                this.server.removeAllListeners('request');
                // @ts-ignore
                this.server.addListener('request', requestListener);
            }
            catch (e) {
                console.log(e);
            }
        }
    };
    ServerHolder.prototype.close = function () {
        if (this.server != null) {
            try {
                this.server.close();
                this.server = null;
            }
            catch (e) {
                console.log(e);
            }
        }
    };
    return ServerHolder;
}());
exports.ServerHolder = ServerHolder;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL25vZGVfc3VwcG9ydC9TZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwyQkFBNkI7QUFHN0I7SUFJRTtRQUhBLFdBQU0sR0FBcUIsSUFBSSxDQUFDO0lBS2hDLENBQUM7SUFFYSxnQkFBRyxHQUFqQjtRQUNFLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXFCLFlBQVksQ0FBQyxRQUFRLEtBQUcsSUFBSSxDQUFFLENBQUMsQ0FBQztRQUNqRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBQztZQUN6QixZQUFZLENBQUMsUUFBUSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7U0FDNUM7UUFDRCxPQUFPLFlBQVksQ0FBQyxRQUFRLENBQUM7SUFDL0IsQ0FBQztJQUVELG1DQUFZLEdBQVosVUFBYSxjQUF1QixFQUFFLGVBQWlDO1FBQ3JFLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxJQUFJLEVBQUM7WUFDdkIsSUFBSTtnQkFDRixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLENBQUM7Z0JBQ2pELElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDO2FBQ3BDO1lBQUMsT0FBTyxDQUFDLEVBQUM7Z0JBQ1QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTthQUNmO1NBQ0Y7YUFBTTtZQUNMLElBQUk7Z0JBQ0YsYUFBYTtnQkFDYix5Q0FBeUM7Z0JBQ3pDLElBQUksQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQzFDLGFBQWE7Z0JBQ2IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLGVBQWUsQ0FBQyxDQUFDO2FBQ3JEO1lBQUMsT0FBTSxDQUFDLEVBQUM7Z0JBQ1IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNoQjtTQUNGO0lBQ0gsQ0FBQztJQUVELDRCQUFLLEdBQUw7UUFDRSxJQUFHLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxFQUFDO1lBQ3JCLElBQUk7Z0JBQ0YsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDcEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUM7YUFDcEI7WUFBQyxPQUFPLENBQUMsRUFBQztnQkFDVCxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ2hCO1NBQ0Y7SUFDSCxDQUFDO0lBQ0gsbUJBQUM7QUFBRCxDQUFDLEFBL0NELElBK0NDO0FBL0NZLG9DQUFZIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgSHR0cCBmcm9tIFwiaHR0cFwiO1xuaW1wb3J0IHtSZXF1ZXN0TGlzdGVuZXJ9IGZyb20gXCJodHRwXCI7XG5cbmV4cG9ydCBjbGFzcyBTZXJ2ZXJIb2xkZXIge1xuICBzZXJ2ZXI6IEh0dHAuU2VydmVyfG51bGwgPSBudWxsO1xuXG4gIHByaXZhdGUgc3RhdGljIGluc3RhbmNlOiBTZXJ2ZXJIb2xkZXI7XG4gIHByaXZhdGUgY29uc3RydWN0b3IoKXtcblxuICB9XG5cbiAgcHVibGljIHN0YXRpYyBnZXQoKXtcbiAgICBjb25zb2xlLmxvZyhgaXMgaW5zdGFuY2UgbnVsbDogJHtTZXJ2ZXJIb2xkZXIuaW5zdGFuY2U9PT1udWxsfWApO1xuICAgIGlmICghU2VydmVySG9sZGVyLmluc3RhbmNlKXtcbiAgICAgIFNlcnZlckhvbGRlci5pbnN0YW5jZSA9IG5ldyBTZXJ2ZXJIb2xkZXIoKTtcbiAgICB9XG4gICAgcmV0dXJuIFNlcnZlckhvbGRlci5pbnN0YW5jZTtcbiAgfVxuXG4gIGNyZWF0ZVNlcnZlcihodHRwU2VydmVyUG9ydD86IG51bWJlciwgcmVxdWVzdExpc3RlbmVyPzogUmVxdWVzdExpc3RlbmVyKXtcbiAgICBpZiAodGhpcy5zZXJ2ZXIgPT09IG51bGwpe1xuICAgICAgdHJ5IHtcbiAgICAgICAgdGhpcy5zZXJ2ZXIgPSBIdHRwLmNyZWF0ZVNlcnZlcihyZXF1ZXN0TGlzdGVuZXIpO1xuICAgICAgICB0aGlzLnNlcnZlci5saXN0ZW4oaHR0cFNlcnZlclBvcnQpO1xuICAgICAgfSBjYXRjaCAoZSl7XG4gICAgICAgIGNvbnNvbGUubG9nKGUpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgLy8gdGhpcy5zZXJ2ZXIucmVtb3ZlTGlzdGVuZXIoJ3JlcXVlc3QnKTtcbiAgICAgICAgdGhpcy5zZXJ2ZXIucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZXF1ZXN0Jyk7XG4gICAgICAgIC8vIEB0cy1pZ25vcmVcbiAgICAgICAgdGhpcy5zZXJ2ZXIuYWRkTGlzdGVuZXIoJ3JlcXVlc3QnLCByZXF1ZXN0TGlzdGVuZXIpO1xuICAgICAgfSBjYXRjaChlKXtcbiAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgY2xvc2UoKXtcbiAgICBpZih0aGlzLnNlcnZlciAhPSBudWxsKXtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRoaXMuc2VydmVyLmNsb3NlKCk7XG4gICAgICAgIHRoaXMuc2VydmVyID0gbnVsbDtcbiAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==