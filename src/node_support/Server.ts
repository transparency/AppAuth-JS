import * as Http from "http";
import {RequestListener} from "http";

export class ServerHolder {
  server: Http.Server|null = null;

  private static instance: ServerHolder;
  private constructor(){

  }

  public static get(){
    console.log(`is instance null: ${ServerHolder.instance===null}`);
    if (!ServerHolder.instance){
      ServerHolder.instance = new ServerHolder();
    }
    return ServerHolder.instance;
  }

  serverRunning(){
    console.log(`is server null: ${this.server===null}`);
    return this.server!=null;
  }

  createServer(httpServerPort?: number, requestListener?: RequestListener){
    try {
      this.server = Http.createServer(requestListener);
      this.server.listen(httpServerPort);
    } catch (e){
      console.log(e)
    }
  }

  setRequestListener(requestListener: RequestListener){
    try {
      // @ts-ignore
      // this.server.removeListener('request');
      this.server.removeAllListeners('request');
      // @ts-ignore
      this.server.addListener('request', requestListener);
    } catch(e){
      console.log(e);
    }

  }

  close(){
    if(this.server != null){
      try {
        this.server.close();
        this.server = null;
      } catch (e){
        console.log(e);
      }
    }
  }
}
