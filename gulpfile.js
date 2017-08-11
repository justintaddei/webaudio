var gulp = require('gulp'),
uglify = require('gulp-uglify'),
babel = require('gulp-babel'),
rename = require('gulp-rename'),
cssmin = require('gulp-cssmin');

gulp.task('css', () => {
    gulp.src('css/*.css')
        .pipe(cssmin())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('dest/css'));
});

gulp.task('js', () => {
    gulp.src('js/*.js')
        .pipe(babel())
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('dest/js'));
});

gulp.task('default', ['js', 'css']);