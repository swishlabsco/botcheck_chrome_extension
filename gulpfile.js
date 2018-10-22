let gulp = require('gulp');
let less = require('gulp-less');
let concat = require('gulp-concat');
let rename = require('gulp-rename');
let del = require('del');

// TODO change
let OUTPUT_DIR_CHROME = 'build/';
let OUTPUT_DIR_SAFARI = 'safari/Botcheck for Twitter/build/';

let paths = {
  scripts: {
    src: [
      'content/namespace.js',
      'config/config.js',
      'vendor/browser-polyfill.js',
      'vendor/vue.js',
      'vendor/vuex.js',
      'vendor/element.js',
      'vendor/axios.js',
      'vendor/lockr.js',
      'content/util.js',
      'content/xbrowser.js',
      'content/components/botcheck-status.js',
      'content/components/dialog-results.js',
      'content/components/dialog-thanks.js',
      'content/store.js',
      'content/scanner.js',
      'content/index.js'
    ],
    dest: 'js/'
  },
  styles: {
    // TODO also need to copy image/font files.
    src: [
      'styles/element.css',
      'styles/style.css',
      'styles/botcheck.less'
    ],
    dest: 'css/'
  },
  icons: {
    src: [
      'icons/**/*',
    ],
    dest: 'icons/'
  }
};

/* Not all tasks need to use streams, a gulpfile is just another node program
 * and you can use all packages available on npm, but it must return either a
 * Promise, a Stream or take a callback and call it
 */
function clean() {
  // You can use multiple globbing patterns as you would with `gulp.src`,
  // for example if you are using del 2.0 or above, return its promise
  return del([OUTPUT_DIR_CHROME, OUTPUT_DIR_SAFARI]);
}

/*
 * Define our tasks using plain functions
 */

// gulp.task('copy', function() {
// 	gulp.src('src/fonts/**')
// 		.pipe(gulp.dest('build/fonts'));
// 	gulp.src('src/icons/**')
// 		.pipe(gulp.dest('build/icons'));
// 	gulp.src('src/_locales/**')
// 		.pipe(gulp.dest('build/_locales'));
// 	return gulp.src('src/manifest.json')
// 		.pipe(gulp.dest('build'));
// });
//
// function copy() {
//
// }

function styles() {
  return gulp
    .src(paths.styles.src)
    .pipe(less())
    .pipe(concat('injected.css'))
    .pipe(gulp.dest(OUTPUT_DIR_CHROME + paths.styles.dest))
    .pipe(gulp.dest(OUTPUT_DIR_SAFARI + paths.styles.dest));
}

function scripts() {
  return gulp
    .src(paths.scripts.src)
    .pipe(concat('injected.js'))
    .pipe(gulp.dest(OUTPUT_DIR_CHROME + paths.scripts.dest))
    .pipe(gulp.dest(OUTPUT_DIR_SAFARI + paths.scripts.dest));
}

function icons() {
  return gulp
    .src(paths.icons.src)
    .pipe(gulp.dest(OUTPUT_DIR_CHROME + paths.icons.dest))
    .pipe(gulp.dest(OUTPUT_DIR_SAFARI + paths.icons.dest));
}

function watch() {
  build();
  gulp.watch(paths.scripts.src, scripts);
  gulp.watch(paths.styles.src, styles);
  gulp.watch(paths.icons.src, icons);
}

/*
 * Specify if tasks run in series or parallel using `gulp.series` and `gulp.parallel`
 */
let build = gulp.series(clean, gulp.parallel(scripts, styles, icons));

gulp.task('clean', clean);
gulp.task('styles', styles);
gulp.task('scripts', scripts);
gulp.task('watch', watch)
gulp.task('build', build);

/*
 * Define default task that can be called by just running `gulp` from cli
 */
gulp.task('default', build);