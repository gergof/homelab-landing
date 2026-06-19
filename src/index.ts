import config from './Config.js';
import HealthcheckService from './HealthcheckService.js';
import createServer from './server.js';

const main = async () => {
	const server = await createServer();
	const healtcheckService = new HealthcheckService();

	server.log.info('Starting Homelab Landing');
	server.log.info({ config }, 'Loaded configuration');

	server.get('/healthz', () => {
		return {
			ok: true
		};
	});

	server.get('/', async (_req, resp) => {
		return resp.view('index.njk', {
			title: config.title,
			favicon: config.favicon,
			generatedAt: new Date().toLocaleString('en', {
				dateStyle: 'medium',
				timeStyle: 'short'
			}),
			projects: await Promise.all(
				config.projects.map(async project => ({
					...project,
					healthcheckResult:
						await healtcheckService.getProjectHealth(project)
				}))
			)
		});
	});

	let shuttingDown = false;
	const shutdown = async (signal: string) => {
		if (shuttingDown) {
			return;
		}

		shuttingDown = true;
		server.log.info({ signal }, 'Received shutdown signal');

		try {
			await server.close();
			server.log.info('Graceful shutdown completed');
			process.exit(0);
		} catch (e) {
			server.log.error(
				{
					signal,
					error: e instanceof Error ? e.message : String(e)
				},
				'Graceful shutdown failed'
			);
			process.exit(1);
		}
	};

	process.once('SIGINT', () => {
		void shutdown('SIGINT');
	});
	process.once('SIGTERM', () => {
		void shutdown('SIGTERM');
	});

	server.log.info('Start listening');
	await server.listen({
		host: config.host,
		port: config.port
	});

	server.log.info('Started listening');
};

main().catch(e => {
	console.log('Application failed to start', e);
	process.exit(1);
});
