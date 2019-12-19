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
    ServerHolder.prototype.serverRunning = function () {
        console.log("is server null: " + (this.server === null));
        return this.server != null;
    };
    ServerHolder.prototype.createServer = function (httpServerPort, requestListener) {
        try {
            this.server = Http.createServer(requestListener);
            this.server.listen(httpServerPort);
        }
        catch (e) {
            console.log(e);
        }
    };
    ServerHolder.prototype.setRequestListener = function (requestListener) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiU2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vc3JjL25vZGVfc3VwcG9ydC9TZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFBQSwyQkFBNkI7QUFHN0I7SUFJRTtRQUhBLFdBQU0sR0FBcUIsSUFBSSxDQUFDO0lBS2hDLENBQUM7SUFFYSxnQkFBRyxHQUFqQjtRQUNFLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXFCLFlBQVksQ0FBQyxRQUFRLEtBQUcsSUFBSSxDQUFFLENBQUMsQ0FBQztRQUNqRSxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBQztZQUN6QixZQUFZLENBQUMsUUFBUSxHQUFHLElBQUksWUFBWSxFQUFFLENBQUM7U0FDNUM7UUFDRCxPQUFPLFlBQVksQ0FBQyxRQUFRLENBQUM7SUFDL0IsQ0FBQztJQUVELG9DQUFhLEdBQWI7UUFDRSxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFtQixJQUFJLENBQUMsTUFBTSxLQUFHLElBQUksQ0FBRSxDQUFDLENBQUM7UUFDckQsT0FBTyxJQUFJLENBQUMsTUFBTSxJQUFFLElBQUksQ0FBQztJQUMzQixDQUFDO0lBRUQsbUNBQVksR0FBWixVQUFhLGNBQXVCLEVBQUUsZUFBaUM7UUFDckUsSUFBSTtZQUNGLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUNqRCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsQ0FBQztTQUNwQztRQUFDLE9BQU8sQ0FBQyxFQUFDO1lBQ1QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtTQUNmO0lBQ0gsQ0FBQztJQUVELHlDQUFrQixHQUFsQixVQUFtQixlQUFnQztRQUNqRCxJQUFJO1lBQ0YsYUFBYTtZQUNiLHlDQUF5QztZQUN6QyxJQUFJLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQzFDLGFBQWE7WUFDYixJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsZUFBZSxDQUFDLENBQUM7U0FDckQ7UUFBQyxPQUFNLENBQUMsRUFBQztZQUNSLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDaEI7SUFFSCxDQUFDO0lBRUQsNEJBQUssR0FBTDtRQUNFLElBQUcsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLEVBQUM7WUFDckIsSUFBSTtnQkFDRixJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNwQixJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQzthQUNwQjtZQUFDLE9BQU8sQ0FBQyxFQUFDO2dCQUNULE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDaEI7U0FDRjtJQUNILENBQUM7SUFDSCxtQkFBQztBQUFELENBQUMsQUFyREQsSUFxREM7QUFyRFksb0NBQVkiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBIdHRwIGZyb20gXCJodHRwXCI7XG5pbXBvcnQge1JlcXVlc3RMaXN0ZW5lcn0gZnJvbSBcImh0dHBcIjtcblxuZXhwb3J0IGNsYXNzIFNlcnZlckhvbGRlciB7XG4gIHNlcnZlcjogSHR0cC5TZXJ2ZXJ8bnVsbCA9IG51bGw7XG5cbiAgcHJpdmF0ZSBzdGF0aWMgaW5zdGFuY2U6IFNlcnZlckhvbGRlcjtcbiAgcHJpdmF0ZSBjb25zdHJ1Y3Rvcigpe1xuXG4gIH1cblxuICBwdWJsaWMgc3RhdGljIGdldCgpe1xuICAgIGNvbnNvbGUubG9nKGBpcyBpbnN0YW5jZSBudWxsOiAke1NlcnZlckhvbGRlci5pbnN0YW5jZT09PW51bGx9YCk7XG4gICAgaWYgKCFTZXJ2ZXJIb2xkZXIuaW5zdGFuY2Upe1xuICAgICAgU2VydmVySG9sZGVyLmluc3RhbmNlID0gbmV3IFNlcnZlckhvbGRlcigpO1xuICAgIH1cbiAgICByZXR1cm4gU2VydmVySG9sZGVyLmluc3RhbmNlO1xuICB9XG5cbiAgc2VydmVyUnVubmluZygpe1xuICAgIGNvbnNvbGUubG9nKGBpcyBzZXJ2ZXIgbnVsbDogJHt0aGlzLnNlcnZlcj09PW51bGx9YCk7XG4gICAgcmV0dXJuIHRoaXMuc2VydmVyIT1udWxsO1xuICB9XG5cbiAgY3JlYXRlU2VydmVyKGh0dHBTZXJ2ZXJQb3J0PzogbnVtYmVyLCByZXF1ZXN0TGlzdGVuZXI/OiBSZXF1ZXN0TGlzdGVuZXIpe1xuICAgIHRyeSB7XG4gICAgICB0aGlzLnNlcnZlciA9IEh0dHAuY3JlYXRlU2VydmVyKHJlcXVlc3RMaXN0ZW5lcik7XG4gICAgICB0aGlzLnNlcnZlci5saXN0ZW4oaHR0cFNlcnZlclBvcnQpO1xuICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgY29uc29sZS5sb2coZSlcbiAgICB9XG4gIH1cblxuICBzZXRSZXF1ZXN0TGlzdGVuZXIocmVxdWVzdExpc3RlbmVyOiBSZXF1ZXN0TGlzdGVuZXIpe1xuICAgIHRyeSB7XG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAvLyB0aGlzLnNlcnZlci5yZW1vdmVMaXN0ZW5lcigncmVxdWVzdCcpO1xuICAgICAgdGhpcy5zZXJ2ZXIucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZXF1ZXN0Jyk7XG4gICAgICAvLyBAdHMtaWdub3JlXG4gICAgICB0aGlzLnNlcnZlci5hZGRMaXN0ZW5lcigncmVxdWVzdCcsIHJlcXVlc3RMaXN0ZW5lcik7XG4gICAgfSBjYXRjaChlKXtcbiAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgIH1cblxuICB9XG5cbiAgY2xvc2UoKXtcbiAgICBpZih0aGlzLnNlcnZlciAhPSBudWxsKXtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRoaXMuc2VydmVyLmNsb3NlKCk7XG4gICAgICAgIHRoaXMuc2VydmVyID0gbnVsbDtcbiAgICAgIH0gY2F0Y2ggKGUpe1xuICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cbiJdfQ==