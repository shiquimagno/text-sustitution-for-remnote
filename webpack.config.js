const { resolve } = require('path');
const { globSync } = require('node:fs');
var path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const { EsbuildPlugin } = require('esbuild-loader');
const { ProvidePlugin, BannerPlugin } = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');


const CopyPlugin = require('copy-webpack-plugin');

const isProd = process.env.NODE_ENV === 'production';
const isDevelopment = !isProd;



const SANDBOX_SUFFIX = '-sandbox';

const config = {
  mode: isProd ? 'production' : 'development',
  entry: globSync('./src/widgets/**/*.tsx').reduce((obj, el) => {
    const rel = path
      .relative('src/widgets', el)
      .replace(/\.[tj]sx?$/, '')
      .replace(/\\/g, '/');

    if (isDevelopment) obj[rel] = resolve(__dirname, el);
    obj[`${rel}${SANDBOX_SUFFIX}`] = resolve(__dirname, el);
    return obj;
  }, {}),

  output: {
    path: resolve(__dirname, 'dist'),
    filename: `[name].js`,
    publicPath: '/',
    clean: true,
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  module: {
    rules: [
      {
        enforce: 'pre',
        test: /[\\/]@remnote[\\/]plugin-sdk[\\/]dist[\\/](index|lib)\.js$/,
        loader: resolve(__dirname, 'scripts/sdk-security-loader.cjs'),
      },
      {
        test: /\.(ts|tsx|jsx|js)?$/,
        loader: 'esbuild-loader',
        options: {
          loader: 'tsx',
          target: 'es2020',
          minify: false,
        },
      },
      {
        test: /\.css$/i,
        use: [
          isDevelopment ? 'style-loader' : MiniCssExtractPlugin.loader,
          { loader: 'css-loader', options: { url: false } },
          'postcss-loader',
        ],
      },
    ],
  },
  plugins: [
    isDevelopment
      ? undefined
      : new MiniCssExtractPlugin({
          filename: '[name].css',
        }),
    new HtmlWebpackPlugin({
      templateContent: `
      <body></body>
      <script type="text/javascript">
      const urlSearchParams = new URLSearchParams(window.location.search);
      const queryParams = Object.fromEntries(urlSearchParams.entries());
      const widgetName = queryParams["widgetName"];
      const allowedWidgets = ['index', 'probe', 'probe_status', 'catalog'];
      if (!allowedWidgets.includes(widgetName)) {
        document.body.textContent = 'Unknown widget.';
        throw new Error('Unknown widget');
      }

      if (${isProd} && ['probe', 'probe_status', 'catalog'].includes(widgetName)) {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = './'+widgetName+'${SANDBOX_SUFFIX}.css';
        document.head.appendChild(css);
      }
      const s = document.createElement('script');
      s.type = "module";
      s.src = './'+widgetName+"${SANDBOX_SUFFIX}.js";
      document.body.appendChild(s);
      </script>
    `,
      filename: 'index.html',
      inject: false,
    }),
    new ProvidePlugin({
      React: 'react',
      reactDOM: 'react-dom',
    }),
    new BannerPlugin({
      banner: (file) => {
        return !file.chunk.name.includes(SANDBOX_SUFFIX) ? 'const IMPORT_META=import.meta;' : '';
      },
      raw: true,
    }),
    new CopyPlugin({
      patterns: [
        { from: 'public', to: '' },
        { from: 'README.md', to: '' },
      ],
    }),

  ].filter(Boolean),
};

if (isProd) {
  config.optimization = {
    minimize: isProd,
    minimizer: [new EsbuildPlugin()],
  };
} else {
  // for more information, see https://webpack.js.org/configuration/dev-server
  config.devServer = {
    port: 8080,
    open: false,
    host: '127.0.0.1',
    allowedHosts: ['localhost', '127.0.0.1'],
    hot: false,
    liveReload: false,
    client: false,
    devMiddleware: { publicPath: '/' },
    compress: true,
    watchFiles: ['src/**/*', 'public/**/*'],
    static: { directory: resolve(__dirname, 'public'), serveIndex: false },
    headers: (request) => ({
      // null is the serialized origin of sandboxed RemNote widget iframes.
      ...(['app://js', 'https://remnote.com', 'https://www.remnote.com',
        'http://localhost:8080', 'http://127.0.0.1:8080', 'null'].includes(request.headers.origin)
        ? { 'Access-Control-Allow-Origin': request.headers.origin } : {}),
      'Vary': 'Origin',
      'X-Content-Type-Options': 'nosniff',
      'Access-Control-Allow-Headers': 'baggage, sentry-trace',
    }),
  };
}

module.exports = config;
