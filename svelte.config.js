import 'dotenv/config';
import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			fallback: '404.html'
		}),
		paths: {
			base: `/${process.env.VITE_GITHUB_REPO}`
		}
	},
	compilerOptions: { experimental: { async: true } }
};

export default config;