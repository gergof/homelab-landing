import dotenv from 'dotenv';
import env from 'env-var';

export enum HealthcheckType {
	none = 'none',
	http = 'http',
	tcp = 'tcp',
	ping = 'ping'
}

export interface ProjectDefinition {
	name: string;
	url: string;
	http: boolean;
	healthcheck: {
		type: HealthcheckType;
		endpoint: string | null;
		timeout: number;
	};
}

class Config {
	public readonly host: string;
	public readonly port: number;
	public readonly title: string;
	public readonly favicon: string | undefined;
	public readonly healthcheckCacheTtl: number;
	public readonly projects: ProjectDefinition[];

	private static DEFAULT_HEALTHCHECK_TIMEOUT: number = 3000;

	constructor() {
		dotenv.config();

		this.host = env.get('HOST').default('0.0.0.0').asString();
		this.port = env.get('PORT').default('3000').asPortNumber();
		this.title = env.get('TITLE').required().asString();
		this.favicon = env.get('FAVICON').asString();
		this.healthcheckCacheTtl = env
			.get('HEALTHCHECK_CACHE_TTL_SECONDS')
			.default('180')
			.asIntPositive();
		this.projects = Object.keys(process.env)
			.filter(envVar => envVar.startsWith('PROJECT_'))
			.sort()
			.map(envVar =>
				this.parseProject(envVar, env.get(envVar).required().asString())
			);
	}

	private parseProject(
		envVar: string,
		definition: string
	): ProjectDefinition {
		// Format: NAME;[!]URL;[HEALTHCHECK_TYPE[|ENDPOINT][|TIMEOUT_MS]]
		const [name, rawUrl, rawHealthcheck] = definition
			.trim()
			.split(';')
			.map(part => part.trim());

		if (!name || !rawUrl) {
			throw new Error(
				`Invalid project definition for ${envVar}. Name and URL are required.`
			);
		}

		const url = rawUrl.replace(/^!/u, '');

		return {
			name,
			url,
			http: !rawUrl.startsWith('!'),
			healthcheck: this.parseHealthcheck(envVar, rawHealthcheck, url)
		};
	}

	private parseHealthcheck(
		envVar: string,
		rawHealthcheck: string | undefined,
		projectUrl: string
	): ProjectDefinition['healthcheck'] {
		// Format: TYPE[|ENDPOINT][|TIMEOUT_MS]
		if (!rawHealthcheck) {
			return {
				type: HealthcheckType.none,
				endpoint: null,
				timeout: 3000
			};
		}

		const [rawType, rawEndpoint, rawTimeout] = rawHealthcheck.split('|');

		if (!rawType) {
			throw new Error(
				`Invalid healthcheck definition for ${envVar}. Type is required.`
			);
		}

		const type = rawType?.trim().toLowerCase() as HealthcheckType;

		if (!Object.values(HealthcheckType).includes(type)) {
			throw new Error(
				`Invalid healthcheck type for ${envVar}. Expected one of ${Object.values(HealthcheckType).join(',')}, but got ${rawType}.`
			);
		}

		return {
			type,
			endpoint: rawEndpoint
				? new URL(rawEndpoint, projectUrl).href
				: projectUrl,
			timeout:
				parseInt(rawTimeout || '', 10) ||
				Config.DEFAULT_HEALTHCHECK_TIMEOUT
		};
	}
}

const config = new Config();

export default config;
