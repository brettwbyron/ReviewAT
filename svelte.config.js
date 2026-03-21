import adapter from '@sveltejs/adapter-static';

const dev = process.argv.includes('dev');

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: '404.html'
		}),
		paths: {
			base: dev ? '' : (process.env.VITE_GITHUB_REPO ? `/${process.env.VITE_GITHUB_REPO}` : '')
		}
	},
	compilerOptions: { experimental: { async: true } }
};

export default config;