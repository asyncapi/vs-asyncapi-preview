import * as path from 'path';
import * as fs from 'fs';
import { tmpdir } from 'os';
import * as vscode from 'vscode';
import * as express from 'express';
import * as http from 'http';
import * as socketio from 'socket.io';
import * as AsyncAPIGenerator from '@asyncapi/generator';

const asyncapiGenerator = new AsyncAPIGenerator('@asyncapi/html-template', tmpdir(), {
  entrypoint: 'index.html',
  output: 'string',
  forceWrite: true,
});

export class PreviewServer {
  host: string;
  port: number;
  io: socketio.Server;
  server: http.Server;

  constructor() {}

  private createExpressAppServer() {
    const app = express();
    app.use('/node_modules', express.static(path.join(__dirname, '..', 'node_modules')));

    app.get('/asyncapi/css/*', async (req, res) => {
      const filename = req.params[0];
      try {
        const content = await AsyncAPIGenerator.getTemplateFile(
          '@asyncapi/html-template/template',
          `css/${filename}`,
          path.resolve(__dirname, '../node_modules')
        );
        res.header('Content-Type', 'text/css').send(content);
      } catch (e) {
        console.error(e);
        return res.status(404).send();
      }
    });

    app.get('/asyncapi/js/*', async (req, res) => {
      const filename = req.params[0];
      try {
        const content = await AsyncAPIGenerator.getTemplateFile(
          '@asyncapi/html-template/template',
          `js/${filename}`,
          path.resolve(__dirname, '../node_modules')
        );
        res.header('Content-Type', 'application/javascript').send(content);
      } catch (e) {
        console.error(e);
        return res.status(404).send();
      }
    });

    app.use('/file/*', (req, res) => {
      // res.header('Content-Type', 'text/html').send(PREVIEW_HTML);
      let htmlContent = fs.readFileSync(path.join(__dirname, '..', 'src', 'preview.html')).toString('utf-8');
      res.setHeader('Content-Type', 'text/html');
      res.send(htmlContent);
    });

    return app;
  }

  public startServer() {
    if (this.isServerRunning()) {
      return;
    }
    this.host = vscode.workspace.getConfiguration('asyncapiPreview').defaultHost || 'localhost';
    this.port = vscode.workspace.getConfiguration('asyncapiPreview').defaultPort || 18513;

    const app = this.createExpressAppServer();
    app.set('host', this.host);
    app.set('port', this.port);

    this.server = http.createServer(app);
    this.io = socketio(this.server);

    this.server.listen(this.port, this.host, () => {
      // console log server is running in port and host
    });

    this.io.on('connection', socket => {
      const filename = path.resolve(decodeURIComponent(socket.handshake.query.filename));
      socket.join(filename);
      this.update(filename);
    });
  }

  async update(filename: string, content = null) {
    try {
      filename = path.resolve(filename);
      content = content || fs.readFileSync(filename).toString('utf-8');
      const html = await asyncapiGenerator.generateFromString(content, { path: filename });
      this.io && this.io.to(filename).emit('CONTENT_UPDATE', html);
    } catch (err) {
      this.io && this.io.to(filename).emit('ERROR', err.toString());
    }
  }

  getUrl(filename: string): string {
    return `http://${this.host}:${this.port}/file/${filename}`;
  }

  public isServerRunning() {
    return this.server != null;
  }

  stop() {
    if (this.server) {
      this.server.close();
    }
    this.server = null;
  }
}
