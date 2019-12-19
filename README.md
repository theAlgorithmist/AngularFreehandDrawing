# Freehand Drawing in Angular Version 8

This is the code distribution for the Medium Article, _[Freehand Drawing in Angular]()_ .

This is an Angular/Typescript version of a variable-width freehand stroke that was part of a Freehand Drawing Library I developed for Flex about nine years ago.  The algorithm can be traced back to about 1983 when I was a teaching assistant for a graduate computational geometry class at UT Arlington.  The professor also worked in industry and his company had recently obtained an expensive tablet that allowed fixed-width strokes to be drawn on a display.  He had an idea for a variable-width stroke that it was my responsibility to 'make work' to support a lab exercise.  Of course, our Tektronix gear of the day did not allow for continuous coordinate input, so we had to simulate 'strokes' with arrays of x- and y-coordinates.

Ah, how far we've come over the decades :)


Author:  Jim Armstrong - [The Algorithmist]

@algorithmist

theAlgorithmist [at] gmail [dot] com

Angular: 8.1.1

PIXI: 4.8.2

Angular CLI: 8.1.1

Typescript: 3.4.3

## Running the demo

The drawing area is represented in a light color.  Click and then drag the mouse to define a stroke.  The stroke currently gets thicker as mouse speed increases.  Click the 'CLEAR' button to clear the display.


The current Freehand drawing API is contained in a single Angular attribute directive (_src/app/drawing/freehand-drawing.directive.ts_) and is summarized below.


```
get width(): number
get height(): number
get numStrokes(): number
get x(): Array<number>
get y(): Array<number>
clear(): void
beginStrokeAt(x: number, y: number, index: number = -1): void
public endStrokeAt(x: number, y: number): void
updateStroke(x: number, y: number):void
eraseStroke(index: number): boolean
```

A stroke may be erased from the current drawing by its zero-based index.  This feature is not currently illustrated in the code.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.


## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.


## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).


License
----

Apache 2.0

**Free Software? Yeah, Homey plays that**

[//]: # (kudos http://stackoverflow.com/questions/4823468/store-comments-in-markdown-syntax)

[The Algorithmist]: <http://algorithmist.net>

