<div align="center">
    <br>
    <h1>@distype/lavalink</h1>
    <p>
        <a href="https://www.npmjs.com/package/@distype/lavalink"><img src="https://img.shields.io/npm/v/@distype/lavalink.svg?color=5162F&style=for-the-badge&logo=npm"></a>
        <a href="https://github.com/distype/lavalink/actions/workflows/build.yml"><img src="https://img.shields.io/github/workflow/status/distype/lavalink/Build?style=for-the-badge&logo=github"><a>
        <a href="https://github.com/distype/lavalink/actions/workflows/tests.yml"><img src="https://img.shields.io/github/workflow/status/distype/lavalink/Tests?label=tests&style=for-the-badge&logo=github"><a>
        <a href="https://discord.gg/hRXKcUKGHB"><img src="https://img.shields.io/discord/564877383308541964?color=5162F1&style=for-the-badge&logo=discord&logoColor=white"></a>
    </p>
</div>

## About

A [lavalink](https://github.com/freyacodes/Lavalink) wrapper with native bindings to Distype, as well as other JavaScript and TypeScript Discord libraries. This library is current tested and developed for [lavalink `v3.4`](https://github.com/freyacodes/Lavalink/releases/tag/3.4), using Java 13.

## HTTP and WebSocket client used

- **[undici](https://undici.nodejs.org/):** A HTTP/1.1 client written from scratch for Node.js, that is significantly faster than Node's built-in http client.
- **[ws](https://github.com/websockets/ws):** A WebSocket client (and server) for Node.js.

## Installation

```sh
npm install @distype/lavalink
```

### Prerequisites

- **[Node.js >=16.13.0](https://nodejs.org/)**
- **[NPM >=8.1.0](https://www.npmjs.com/)**

### Optional packages

- **[bufferutil](https://www.npmjs.com/package/bufferutil/):** Improves ws performance
- **[utf-8-validate](https://www.npmjs.com/package/utf-8-validate/):** Improves ws performance
