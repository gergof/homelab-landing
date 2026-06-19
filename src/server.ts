import path from 'node:path';
import url from 'node:url';

import FastifyStatic from '@fastify/static';
import FastifyView from '@fastify/view';
import Fastify from 'fastify';
import Nunjucks from 'nunjucks';

const createServer = async () => {
	const server = Fastify({ logger: true });

	const staticRoot = path.join(
		path.dirname(url.fileURLToPath(import.meta.url)),
		'static'
	);
	const viewsRoot = path.join(
		path.dirname(url.fileURLToPath(import.meta.url)),
		'views'
	);

	await server.register(FastifyStatic, {
		root: staticRoot,
		prefix: '/static/'
	});
	server.log.debug({ root: staticRoot }, 'Registered static assets');

	await server.register(FastifyView, {
		root: viewsRoot,
		engine: {
			nunjucks: Nunjucks
		}
	});
	server.log.debug({ root: viewsRoot }, 'Registered view renderer');

	return server;
};

export default createServer;
