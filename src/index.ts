import config from './Config.js';
import HealthcheckService from './HealthcheckService.js';
import createServer from './server.js';

const main = async () => {
	const server = await createServer();
	const healthcheckService = new HealthcheckService(
		server.log.child({ component: 'healthcheck' })
	);

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
						await healthcheckService.getProjectHealth(project)
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

	server.log.info(
		{
			host: config.host,
			port: config.port
		},
		'Start listening'
	);
	await server.listen({
		host: config.host,
		port: config.port
	});
	server.log.info(
		{
			host: config.host,
			port: config.port
		},
		'Started listening'
	);
};

main().catch(e => {
	console.error('Application failed to start', e);
	process.exit(1);
});
