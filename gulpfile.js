'use strict';

var pkg            = require('./package.json');
var del            = require('del');
var gulp           = require('gulp');
var moment         = require('moment');
var semver         = require('semver');
var runSequence    = require('run-sequence');
var browserSync    = require('browser-sync');

var $ = require('gulp-load-plugins')();

var log                  = $.util.log;
var argv                 = $.util.env;
var ENV                  = !!argv.env ? argv.env : 'dev';
var COLORS               = $.util.colors;
var BROWSERS             = !!argv.browsers ? argv.browsers : 'PhantomJS';

if(!ENV.match(new RegExp(/prod|dev|test/))) {
    log(COLORS.red('Error: The argument \'env\' has incorrect value \'' + ENV +'\'! Usage: gulp test:e2e --env=(prod|dev|test)'));
    return process.exit(1);
}

if(!BROWSERS.match(new RegExp(/PhantomJS|Chrome|Firefox|Safari/))) {
    log(COLORS.red('Error: The argument \'browsers\' has incorrect value \'' + BROWSERS +'\'! Usage: gulp test:unit --browsers=(PhantomJS|Chrome|Firefox|Safari)'));
    return process.exit(1);
}

log(COLORS.blue('********** RUNNING IN ' + ENV + ' ENVIRONMENT **********'));

function startBrowserSync(baseDir, files, browser) {
    browser = browser === undefined ? 'default' : browser;
    files = files === undefined ? 'default' : files;

    browserSync({
        files: files,
        port: 3000,
        notify: false,
        server: {
            baseDir: baseDir
        },
        browser: browser
    });
}

var paths = {
    gulpfile:   'gulpfile.js',
    app: {
        basePath:       'src/',
        fonts:          ['src/fonts/**/*.{eot,svg,ttf,woff}', 'src/vendor/**/*.{eot,svg,ttf,woff}'],
        styles:         'src/styles/**/*.css',
        images:         'src/images/**/*.{png,gif,jpg,jpeg}',
        config: {
            dev:        'src/app/core/config/core.config.dev.js',
            test:       'src/app/core/config/core.config.test.js',
            prod:       'src/app/core/config/core.config.prod.js'
        },
        scripts:        ['src/app/**/*.js',
                         '!src/app/**/*.spec.js'
        ],
        html:           'src/index.html',
        templates:      'src/app/**/*.html'
    },
    tmp: {
        basePath:       '.tmp/',
        styles:         '.tmp/styles/',
        scripts:        '.tmp/scripts/'
    },
    build: {
        basePath:       'build/',
        dist: {
            basePath:   'build/dist/',
            fonts:      'build/dist/fonts/',
            images:     'build/dist/images/',
            styles:     'build/dist/styles/',
            scripts:    'build/dist/scripts/'
        },
        docs:           'build/docs/'
    }
};

var banner = $.util.template(
    '/**\n' +
    ' * <%= pkg.description %>\n' +
    ' * @version v<%= pkg.version %> - <%= today %>\n' +
    ' * @author <%= pkg.author.name %>\n' +
    ' * @copyright <%= year %>(c) <%= pkg.author.name %>\n' +
    ' * @license <%= pkg.license.type %>, <%= pkg.license.url %>\n' +
    ' */\n', {file: '', pkg: pkg, today: moment(new Date()).format('D/MM/YYYY'), year: new Date().toISOString().substr(0, 4)});

gulp.task('clean', function (cb) {
    var files = [].concat(paths.build.basePath, paths.tmp.basePath);
    log('Cleaning: ' + COLORS.blue(files));

    return del(files, cb);
});

gulp.task('jshint', function () {
    return gulp.src(paths.app.scripts.concat(paths.gulpfile))
        .pipe($.jshint('.jshintrc'))
        .pipe($.jshint.reporter('jshint-stylish'))
        .pipe($.jshint.reporter('fail'));
});

gulp.task('htmlhint', function () {
    return gulp.src([paths.app.html, paths.app.templates])
        .pipe($.htmlhint('.htmlhintrc'))
        .pipe($.htmlhint.reporter())
        .pipe($.htmlhint.failReporter());
});

gulp.task('watch', function () {
    gulp.watch([paths.app.images, paths.app.fonts], [browserSync.reload]);
    //gulp.watch(paths.app.styles, ['sass']);
    gulp.watch([paths.app.scripts, paths.gulpfile], ['jshint', browserSync.reload]);
    gulp.watch([paths.app.html, paths.app.templates], ['htmlhint', browserSync.reload]);
});

gulp.task('extras', function () {
    return gulp.src([paths.app.basePath + '*.{ico,png,txt}'])
        .pipe(gulp.dest(paths.build.dist.basePath));
});

gulp.task('fonts', function () {
    return gulp.src(paths.app.fonts)
        .pipe($.filter('**/*.{eot,svg,ttf,woff}'))
        .pipe($.flatten())
        .pipe(gulp.dest(paths.build.dist.fonts))
        .pipe($.size({title: 'fonts'}));
});

gulp.task('images', function () {
    return gulp.src(paths.app.images)
        .pipe($.cache($.imagemin({
            progressive: true,
            interlaced: true
        })))
        .pipe(gulp.dest(paths.build.dist.images))
        .pipe($.size({title: 'images'}));
});

gulp.task('compile', ['htmlhint'], function () {
    var projectHeader = $.header(banner);

    return gulp.src(paths.app.html)
        .pipe($.inject(gulp.src(paths.tmp.scripts + 'build.js', {read: false}), {
            starttag: '<!-- inject:build:js -->',
            ignorePath: [paths.app.basePath]
        }))
        .pipe($.usemin({
            css:        [
                $.minifyCss({keepSpecialComments:0}),
                $.rev(),
                projectHeader
            ],
            js:         [
                $.ngAnnotate({add: true, single_quotes: true, stats: true}),
                $.uglify(),
                $.rev(),
                projectHeader
            ],
            html:       [
                $.minifyHtml({empty:true}),
            ]
        }))
        .pipe(gulp.dest(paths.build.dist.basePath))
        .pipe($.size({title: 'compile', showFiles: true}));
});

gulp.task('serve', ['watch'], function() {
    startBrowserSync(['.tmp', 'src', './' ]);
});

gulp.task('default', ['serve']);

gulp.task('serve:dist', ['build'], function() {
    startBrowserSync([paths.build.dist.basePath]);
});

gulp.task('build', function (cb) {
    runSequence(
        'clean',
        ['compile', 'extras', 'images', 'fonts'],
        cb
    );
});

gulp.task('bump', ['jshint', 'htmlhint'], function () {
    var HAS_REQUIRED_ATTRIBUTE = !!argv.type ? !!argv.type.match(new RegExp(/major|minor|patch/)) : false;

    if (!HAS_REQUIRED_ATTRIBUTE) {
        log(COLORS.red('Error: Required bump \'type\' is missing! Usage: gulp bump --type=(major|minor|patch)'));
        return process.exit(1);
    }

    if (!semver.valid(pkg.version)) {
        log(COLORS.red('Error: Invalid version number - ' + pkg.version));
        return process.exit(1);
    }

    return gulp.src(['package.json'])
        .pipe($.bump({type: argv.type}))
        .pipe(gulp.dest('./'));
});
