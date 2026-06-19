import net from 'node:net';

import NodeCache from 'node-cache';
import ping from 'ping';

import config, { HealthcheckType, ProjectDefinition } from './Config.js';

export enum HealthStatus {
	unknown = 'unknown',
	healthy = 'healthy',
	unhealthy = 'unhealthy'
}

interface HealthcheckResult {
	status: HealthStatus;
	responseTimeMs: number | null;
	error: string | null;
}

interface CachedHealthcheckResult extends HealthcheckResult {
	checkedAt: Date;
}

class HealthcheckService {
	private readonly cache = new NodeCache({
		stdTTL: config.healthcheckCacheTtl,
		checkperiod: config.healthcheckCacheTtl + 10
	});

	public async getProjectHealth(
		project: ProjectDefinition
	): Promise<CachedHealthcheckResult> {
		const cached = this.cache.get<CachedHealthcheckResult>(project.name);

		if (cached) {
			return cached;
		}

		const result = await this.check(project);
		const cacheableResult = {
			...result,
			checkedAt: new Date()
		};

		this.cache.set<CachedHealthcheckResult>(project.name, cacheableResult);

		return cacheableResult;
	}

	private async check(
		project: ProjectDefinition
	): Promise<HealthcheckResult> {
		switch (project.healthcheck.type) {
			case HealthcheckType.none:
				return {
					status: HealthStatus.unknown,
					responseTimeMs: null,
					error: null
				};
			case HealthcheckType.http:
				return this.runCheck(project, this.runHttpCheck.bind(this));
			case HealthcheckType.tcp:
				return this.runCheck(project, this.runTcpCheck.bind(this));
			case HealthcheckType.ping:
				return this.runCheck(project, this.runPingCheck.bind(this));
		}
	}

	private async runCheck(
		project: ProjectDefinition,
		checkFn: (project: ProjectDefinition) => Promise<void>
	): Promise<HealthcheckResult> {
		const start = performance.now();

		try {
			await checkFn(project);

			return {
				status: HealthStatus.healthy,
				responseTimeMs: Math.round(performance.now() - start),
				error: null
			};
		} catch (e) {
			return {
				status: HealthStatus.unhealthy,
				responseTimeMs: Math.round(performance.now() - start),
				error: e instanceof Error ? e.message : 'Healthcheck failed'
			};
		}
	}

	private async runHttpCheck(project: ProjectDefinition): Promise<void> {
		const url = this.getEndpointUrl(project.healthcheck.endpoint);

		const response = await fetch(url.href, {
			redirect: 'follow',
			signal: AbortSignal.timeout(project.healthcheck.timeout)
		});

		if (!response.ok) {
			throw new Error(`HTTP code ${response.status}`);
		}
	}

	private async runTcpCheck(project: ProjectDefinition): Promise<void> {
		const url = this.getEndpointUrl(project.healthcheck.endpoint);

		await new Promise<void>((resolve, reject) => {
			const socket = net.createConnection({
				host: url.hostname,
				port: Number(url.port)
			});

			socket.setTimeout(project.healthcheck.timeout);

			socket.once('connect', () => {
				socket.end();
				resolve();
			});
			socket.once('timeout', () => {
				socket.destroy();
				reject(new Error('TCP connection timeout'));
			});
			socket.once('error', e => {
				socket.destroy();
				reject(e);
			});
		});
	}

	private async runPingCheck(project: ProjectDefinition): Promise<void> {
		const url = this.getEndpointUrl(project.healthcheck.endpoint);

		const result = await ping.promise.probe(url.hostname, {
			timeout: Math.max(1, Math.ceil(project.healthcheck.timeout / 1000)),
			min_reply: 1
		});

		if (!result.alive) {
			throw new Error(result.output);
		}
	}

	private getEndpointUrl(endpoint: string | null): URL {
		if (!endpoint) {
			throw new Error('Endpoint not configured');
		}

		if (endpoint.includes('://')) {
			return new URL(endpoint);
		}

		return new URL(`http://${endpoint}`);
	}
}

export default HealthcheckService;
