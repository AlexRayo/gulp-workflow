// Initialize modules
// Importing specific gulp API functions lets us write them below as series() instead of gulp.series()
const { src, dest, watch, series, parallel } = require('gulp');
// Importing all the Gulp-related packages we want to use
const plumber = require('gulp-plumber');
const pug = require('gulp-pug');
const sass = require('gulp-sass')(require('sass'));
const concat = require('gulp-concat'); //Concat js files in one
const terser = require('gulp-terser'); //terser came to replace uglify of js
const postcss = require('gulp-postcss'); //compiles the css plugins passed as paramethers like: autoprefixer, cssnano...
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');// compress the css file
const replace = require('gulp-replace'); //add a query string to our html files to help with cache busting with css and js
const browsersync = require('browser-sync').create();//server to live reload

// File paths
const files = {
    scssPath: 'src/scss/style.scss',
	pugPath: 'src/pug/*.pug',
	jsPath: 'src/js/**/*.js',
};

//handing errors; another way is using gulp-plumber
function errorLog(error) {
	console.error(error);
	this.emit('end');
}

//pugTask: compiles the index.pug file into index.html
function pugTask() {
	return src(files.pugPath)
		.pipe(pug({
            doctype: 'html', //add the doctype in case your forget in your pug file
            pretty: true //allows to format the final file, otherwise will shown as single line
         }))
		.on('error', errorLog)//we need to use our own handling error function
		.pipe(dest('dist'));//put final html file into the root folder 
}

// Sass task: compiles the style.scss file into style.css
function scssTask() {
	return src(files.scssPath, { sourcemaps: true }) // set source and turn on sourcemaps
		.pipe(sass().on('error', sass.logError)) // compile SCSS to CSS and watch for errors
		.pipe(postcss([autoprefixer(), cssnano()])) // PostCSS plugins
		.pipe(dest('dist/css', { sourcemaps: '.' })); // put final CSS in dist folder with sourcemap		
}

// JS task: concatenates and uglifies JS files to script.js
function jsTask() {
	return src(
		[
			files.jsPath,
			//,'!' + 'includes/js/jquery.min.js', // to exclude any specific files
		],
		{ sourcemaps: true }
	)
		.pipe(concat('main.js'))
		.pipe(terser())
		.pipe(dest('dist/js', { sourcemaps: '.' }));
}

// Cachebust
function cacheBustTask() {
	var cbString = new Date().getTime();
	return src(['dist/index.html'])
		.pipe(replace(/cb=\d+/g, 'cb=' + cbString))
		.pipe(dest('dist'));
}

// Browsersync to spin up a local server
function browserSyncServe(callback) {
	// initializes browsersync server
	browsersync.init({
		server: {
			baseDir: 'dist',
		},
		notify: {
			styles: {
				top: 'auto',
				bottom: '0',
			},
		},
	});
	callback();
}
function browserSyncReload(callback) {
	// reloads browsersync server
	browsersync.reload();
	callback();
}

// Browsersync Watch task
// Watch HTML file for change and reload browsersync server
// watch SCSS and JS files for changes, run scss and js tasks simultaneously and update browsersync
function bsWatchTask() {
	watch('dist/index.html', browserSyncReload);
	watch(
		[files.pugPath, files.scssPath, files.jsPath],
		{ interval: 1000, usePolling: true }, //Makes docker work
		series(parallel(pugTask, scssTask, jsTask), cacheBustTask, browserSyncReload)
	);
}

// Export the default Gulp task so it can be run
// Runs the scss and js tasks simultaneously
// then runs cacheBust, then watch task
// Run by typing in "gulp bs" on the command line
exports.default = series(
	parallel(pugTask, scssTask, jsTask),
	cacheBustTask,
	browserSyncServe,
	bsWatchTask
);
