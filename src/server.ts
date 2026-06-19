import path from 'node:path';
import url from 'node:url';

import FastifyStatic from '@fastify/static';
import FastifyView from '@fastify/view';
import Fastify from 'fastify';
import Nunjucks from 'nunjucks';

const createServer = async () => {
	const server = Fastify({ logger: true });

	await server.register(FastifyStatic, {
		root: path.join(
			path.dirname(url.fileURLToPath(import.meta.url)),
			'static'
		),
		prefix: '/static/'
	});

	await server.register(FastifyView, {
		root: path.join(
			path.dirname(url.fileURLToPath(import.meta.url)),
			'views'
		),
		engine: {
			nunjucks: Nunjucks
		}
	});

	return server;
};

export default createServer;
