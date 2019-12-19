/**
 * Copyright 2016 Jim Armstrong (www.algorithmist.net)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Attribute directive to imbue a container such as a DIV with freehand drawing capability
 * @author Jim Armstrong (www.algorithmist.net)
 *
 * @version 1.0
 */

import * as PIXI from 'pixi.js/dist/pixi.js';

// platform imports
import {
  AfterViewInit,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChange,
  SimpleChanges
} from '@angular/core';

@Directive({
  selector: '[freehand]'
})

export class FreehandDrawingDirective implements AfterViewInit, OnChanges, OnDestroy
{
  @Input()
  public interactive: boolean;

  @Input()
  public cache: boolean;

  @Input()
  public smoothing: number;

  @Input()
  public fillColor: number;

  @Output('beginStroke')
  protected _beginStroke: EventEmitter<string>;

  @Output('endStroke')
  protected _endStroke: EventEmitter<string>;

  // static PIXI options
  protected static OPTIONS: Object = {
    backgroundColor: 0xeeeeee,
    antialias: true
  };

  protected _container: HTMLDivElement;        // DOM container for freehand strokes (DIV)
  protected _rect: ClientRect | DOMRect;

  protected _handlersAssigned: boolean;        // true if mouse handlers assigned to primary container

  protected _strokeContainer: PIXI.Container;  // PixiJS Container for all strokes

  // collection of all strokes and reference to current stroke and current tip
  protected _strokes: Array<PIXI.Container>;
  protected _curStrokeContainer: PIXI.Container;
  protected _stroke: PIXI.Graphics;
  protected _tip: PIXI.Graphics;

  // PIXI app and stage references
  protected _app: PIXI.Application;
  protected _stage: PIXI.Container;
  protected _width: number;
  protected _height: number;

  // cached drawing properties
  protected  _lastRotation: number;
  protected  _lineRotation: number;
  protected  _L1Sin1: number;
  protected  _L1Cos1: number;
  protected  _controlX1: number;
  protected  _controlY1: number;
  protected  _controlX2: number;
  protected  _controlY2: number;
  protected  _taperThickness: number;
  protected  _taper: number;

  // mouse status/properties/etc
  protected _mouseMoved: boolean;
  protected _lastSmoothedMouseX: number;
  protected _lastSmoothedMouseY: number;
  protected _smoothedMouseX: number;
  protected _smoothedMouseY: number;
  protected _lastMouseX: number;
  protected _lastMouseY: number;
  protected _startX: number;
  protected _startY: number;
  protected _mouseDeltaX: number;
  protected _mouseDeltaY: number;
  protected _lastMouseChangeVectorX: number;
  protected _lastMouseChangeVectorY: number;
  protected _mousePressed: boolean;

  // line thickness properties
  protected _lastThickness: number;
  protected _lineThickness: number;
  protected _tipTaperFactor: number;
  protected _minThickness: number;
  protected _thicknessFactor: number;
  protected _thicknessSmoothingFactor: number;

  // optional cached x- and y-coordinates
  protected _x: Array<number>;
  protected _y: Array<number>;

  // optional mouse handlers
  protected _mouseDown: (evt: MouseEvent) => void;
  protected _mouseUp: (evt: MouseEvent) => void;
  protected _mouseMove: (evt: MouseEvent) => void;

  constructor(protected _elRef: ElementRef)
  {
    // some reasonable defaults
    this.fillColor   = 0x0000ff;
    this.smoothing   = 0.3;
    this.interactive = true;
    this.cache       = true;

    this._container = <HTMLDivElement> this._elRef.nativeElement;
    this._rect      = this._container.getBoundingClientRect();

    const options = Object.assign({width: this._container.clientWidth, height: this._container.clientHeight},
      FreehandDrawingDirective.OPTIONS);

    this._app = new PIXI.Application(options);

    this._container.appendChild(this._app.view);

    this._stage  = this._app.stage;
    this._width  = this._app.view.width;
    this._height = this._app.view.height;

    this._minThickness             = 1;
    this._tipTaperFactor           = 0.8;
    this._thicknessFactor          = 0.3;
    this._thicknessSmoothingFactor = 0.3;

    this._beginStroke = new EventEmitter<string>();
    this._endStroke   = new EventEmitter<string>();

    this._strokes = new Array<PIXI.Container>();

    this._x = new Array<number>();
    this._y = new Array<number>();

    this.__pixiSetup();
    this.clear();
  }

  public ngAfterViewInit()
  {
    if (this.interactive && !this._handlersAssigned) {
      this.__assignMouseHandlers();
    }
  }

  public ngOnChanges(changes: SimpleChanges): void
  {
    let prop: string;
    let change: SimpleChange;

    for (prop in changes)
    {
      change = changes[prop];

      // add as much property validation as desired
      switch (prop)
      {
        case 'cache':
          this.cache = change.currentValue === true;
          break;

        case 'interactive':
          this.interactive = change.currentValue === true;
          if (this.interactive)
          {
            // assign event handlers to the container
            this.__assignMouseHandlers();
          }
          else
          {
            // removal
            this.__removeMouseHandlers();
          }
          break;

        case 'smoothing':
          const s: number = change.currentValue;
          this.smoothing  = !isNaN(s) && s > 0 && s < 0.75 ? s : this.smoothing;
          break;

        case 'fillColor':
          const f: number = +change.currentValue;
          this.fillColor  = f !== undefined && !isNaN(f) ? f : this.fillColor;
          break;
      }
    }
  }

  public ngOnDestroy(): void
  {
    if (this.interactive) {
      this.__removeMouseHandlers();
    }
  }

  /**
   * Access width of the drawing-area container
   */
  public get width(): number
  {
    return this._width;
  }

  /**
   * Access height of the drawing-area container
   */
  public get height(): number
  {
    return this._height;
  }

  /**
   * Access the number of strokes
   */
  public get numStrokes(): number
  {
    return this._strokes.length;
  }

  /**
   * Access the list of x-coordinates defined during the current stroke
   */
  public get x(): Array<number>
  {
    return this._x.slice();
  }

  /**
   * Access the list of y-coordinates defined during the current stroke
   */
  public get y(): Array<number>
  {
    return this._y.slice();
  }

  /**
   * Clear the current drawing area; the graphics context is erased and all stroke information is deleted
   */
  public clear(): void
  {
    this._lastRotation   = 0;
    this._lineRotation   = 0;
    this._L1Sin1         = 0;
    this._L1Cos1         = 0;
    this._controlX1      = 0;
    this._controlY1      = 0;
    this._controlX2      = 0;
    this._controlY2      = 0;
    this._taperThickness = 0;
    this._taper          = 0;

    this._mouseMoved             = false;
    this._lastSmoothedMouseX     = 0;
    this._lastSmoothedMouseY     = 0;
    this._smoothedMouseX         = 0;
    this._smoothedMouseY         = 0;
    this._lastMouseX             = 0;
    this._lastMouseY             = 0;
    this._startX                 = 0;
    this._startY                 = 0;
    this._mouseDeltaX            = 0;
    this._mouseDeltaY            = 0;
    this._lastMouseChangeVectorX = 0;
    this._lastMouseChangeVectorY = 0;

    this._handlersAssigned = false;
    this._mousePressed     = false;

    const strokeCount: number = this.numStrokes;
    let c: PIXI.Container;

    let i: number;
    for (i = 0; i < strokeCount; ++i)
    {
      c = this._strokes[i];

      if (this._strokeContainer !== undefined)
      {
        while (c.children.length > 0)
        {
          c.children[0].clear();
          c.removeChildAt(0);
        }
      }
    }

    while(this._strokeContainer.children.length > 0) {
      this._strokeContainer.removeChildAt(0);
    }

    this._strokes.length = 0;
  }

  /**
   * Begin a manually-defined stroke at the supplied coordinates relative to the origin of the container (DIV)
   *
   * @param x x-coordinate of simulated mouse position in container coordinates
   * 
   * @param y y-coordinate of simulated mouse position in container coordinates
   *
   * @param index Zero-based stroke (use default to add onto the existing stroke collection)
   */
  public beginStrokeAt(x: number, y: number, index: number = -1): void
  {
    this._x.length = 0;
    this._y.length = 0;

    if (this.cache)
    {
      this._x.push(x);
      this._y.push(y);
    }

    this._startX = this._lastMouseX = this._smoothedMouseX = this._lastSmoothedMouseX = x;
    this._startY = this._lastMouseY = this._smoothedMouseY = this._lastSmoothedMouseY = y;

    this._lastThickness          = 0;
    this._lastRotation           = Math.PI/2;
    this._lastMouseChangeVectorX = 0;
    this._lastMouseChangeVectorY = 0;

    this._mouseMoved = false;

    this._stroke = new PIXI.Graphics();
    this._tip    = new PIXI.Graphics();

    // if there is no specified stroke index to draw into, create a new container and add onto the set of existing strokes
    if (index == -1)
    {
      this._curStrokeContainer = new PIXI.Container();

      this._curStrokeContainer.addChild(this._stroke);
      this._curStrokeContainer.addChild(this._tip);

      this._strokes.push(this._curStrokeContainer);
      this._strokeContainer.addChild(this._curStrokeContainer);
    }
    else
    {
      this._curStrokeContainer = this._strokes[index];

      // clean up anything in this container as it's about to be overwritten
      if (this._curStrokeContainer.numChildren > 0) {
        this._curStrokeContainer.removeChildAt(0);
      }

      this._curStrokeContainer.addChild(this._stroke);
      this._curStrokeContainer.addChild(this._tip);
    }

    this._mousePressed = true;

    this._beginStroke.emit('beginStroke');
  }

  /**
   * End a manually-defined stroke at the supplied coordinates
   *
   * @param x x-coordinate of simulated mouse position in container coordinates
   *
   * @param y y-coordinate of simulated mouse position in container coordinates
   */
  public endStrokeAt(x: number, y: number): void
  {
    if (this.cache)
    {
      this._x.push(x);
      this._y.push(y);
    }

    this.__drawTip(true, x, y);

    // remove the tip layer from the stroke
    this._tip.clear();

    this._curStrokeContainer.removeChild(this._tip);
    this._tip = null;

    this._mousePressed = false;

    this._endStroke.emit('endStroke');
  }

  /**
   * Erase a single stroke indicated by the supplied index and return true if the index is in the correct range, false otherwise.
   * The selected stroke is permanently removed from the drawing.  This operation may not be undone.
   *
   * @param index Zero-based index of stroke to erase from drawing
   */
  public eraseStroke(index: number): boolean
  {
    if (index < this._strokes.length)
    {
      let s: PIXI.Container = this._strokes[index];

      if (this._strokeContainer.contains(s) ) {
        this._strokeContainer.removeChild(s);
      }

      s = null;

      this._strokes.splice(index, 1);

      return true;
    }

    return false;
  }

  /**
   * Update a manually drawn stroke already begun with a call to {beginStrokeAt} in container coordinates.  A simulated
   * stroke begins with a single call to {beginStrokeAt}, one or more calls to {updateStroke}, and a single call to
   * {endStroke}.
   *
   * @param x x-coordinate of simulated mouse position in container coordinates
   *
   * @param y y-coordinate of simulated mouse position in container coordinates
   */
  public updateStroke(x: number, y: number):void
  {
    if (!this._mousePressed) {
      return;
    }

    if (this.cache)
    {
      this._x.push(x);
      this._y.push(y);
    }

    this._mouseDeltaX = x - this._lastMouseX;
    this._mouseDeltaY = y - this._lastMouseY;

    this._mouseMoved = true;

    // Cusp detection using dot-product since the angle involved is pi/2
    if (this._mouseDeltaX*this._lastMouseChangeVectorX + this._mouseDeltaY*this._lastMouseChangeVectorY < 0)
    {
      this.__drawTip(true, this._lastMouseX, this._lastMouseY);

      this._smoothedMouseX = this._lastSmoothedMouseX = this._lastMouseX;
      this._smoothedMouseY = this._lastSmoothedMouseY = this._lastMouseY;
      this._lastRotation  += Math.PI;
      this._lastThickness  = this._tipTaperFactor*this._lastThickness;
    }

    // smoothing
    this._smoothedMouseX += this.smoothing*(x - this._smoothedMouseX);
    this._smoothedMouseY += this.smoothing*(y - this._smoothedMouseY);

    // line thickness determined by distance since last smoothed move
    const dx: number   = this._smoothedMouseX - this._lastSmoothedMouseX;
    const dy: number   = this._smoothedMouseY - this._lastSmoothedMouseY;
    const dist: number = Math.sqrt(dx*dx + dy*dy);

    const targetLineThickness: number = this._minThickness + this._thicknessFactor*dist;

    this._lineRotation  = dist !== 0 ? Math.PI/2 + Math.atan2(dy, dx) : 0;
    this._lineThickness = this._lastThickness + this._thicknessSmoothingFactor*(targetLineThickness - this._lastThickness);

    // quads used to mimic line thickness
    const sin0: number = Math.sin(this._lastRotation);
    const cos0: number = Math.cos(this._lastRotation);
    const sin1: number = Math.sin(this._lineRotation);
    const cos1: number = Math.cos(this._lineRotation);

    const L0Sin0: number = this._lastThickness*sin0;
    const L0Cos0: number = this._lastThickness*cos0;
    this._L1Sin1         = this._lineThickness*sin1;
    this._L1Cos1         = this._lineThickness*cos1;

    const controlVecX: number = 0.33*dist*sin0;
    const controlVecY: number = -0.33*dist*cos0;

    this._controlX1 = this._lastSmoothedMouseX + L0Cos0 + controlVecX;
    this._controlY1 = this._lastSmoothedMouseY + L0Sin0 + controlVecY;
    this._controlX2 = this._lastSmoothedMouseX - L0Cos0 + controlVecX;
    this._controlY2 = this._lastSmoothedMouseY - L0Sin0 + controlVecY;

    const g: PIXI.Graphics = this._stroke;

    g.beginFill(this.fillColor, 1);
    g.moveTo(this._lastSmoothedMouseX + L0Cos0, this._lastSmoothedMouseY + L0Sin0);
    g.quadraticCurveTo(this._controlX1, this._controlY1, this._smoothedMouseX + this._L1Cos1, this._smoothedMouseY + this._L1Sin1);
    g.lineTo(this._smoothedMouseX - this._L1Cos1, this._smoothedMouseY - this._L1Sin1);
    g.quadraticCurveTo(this._controlX2, this._controlY2, this._lastSmoothedMouseX - L0Cos0, this._lastSmoothedMouseY - L0Sin0);
    g.lineTo(this._lastSmoothedMouseX + L0Cos0, this._lastSmoothedMouseY + L0Sin0);
    g.endFill();

    this.__drawTip(false, x, y);

    this._lastSmoothedMouseX     = this._smoothedMouseX;
    this._lastSmoothedMouseY     = this._smoothedMouseY;
    this._lastRotation           = this._lineRotation;
    this._lastThickness          = this._lineThickness;
    this._lastMouseChangeVectorX = this._mouseDeltaX;
    this._lastMouseChangeVectorY = this._mouseDeltaY;
    this._lastMouseX             = x;
    this._lastMouseY             = y;
  }

  protected __assignMouseHandlers(): void
  {
    this._mouseDown = (evt: MouseEvent) => this.beginStrokeAt(evt.clientX - this._rect.left, evt.clientY - this._rect.top);
    this._mouseUp   = (evt: MouseEvent) => this.endStrokeAt(evt.clientX - this._rect.left, evt.clientY - this._rect.top);
    this._mouseMove = (evt: MouseEvent) => this.updateStroke(evt.clientX - this._rect.left, evt.clientY - this._rect.top);

    this._container.addEventListener('mousedown', this._mouseDown);
    this._container.addEventListener('mouseup', this._mouseUp);
    this._container.addEventListener('mousemove', this._mouseMove);

    this._handlersAssigned = true;
  }

  protected __removeMouseHandlers(): void
  {
    if (this._mouseDown !== undefined) {
      this._container.addEventListener('mousedown', this._mouseDown);
    }

    if (this._mouseUp !== undefined) {
      this._container.addEventListener('mouseup', this._mouseUp);
    }

    if (this._mouseMove !== undefined) {
      this._container.addEventListener('mousemove', this._mouseMove);
    }

    this._handlersAssigned = false;
  }

  protected __pixiSetup(): void
  {
    this._strokeContainer = new PIXI.Container();

    this._stage.addChild(this._strokeContainer);
  }

  protected __drawTip(isFinal: boolean, x: number, y: number): void
  {
    // note - updateStroke must have previously called for the variables used here to be valid
    this._taperThickness = this._tipTaperFactor*this._lineThickness;
    let g: PIXI.Graphics = this._stroke;

    if (!isFinal) {
      g = this._tip;
      this._tip.clear();
    }

    g.beginFill(this.fillColor, 1);
    g.drawCircle(x, y, this._taperThickness);
    g.endFill();

    // draw final segment with straight lines
    this._taper = this._tipTaperFactor;   // simplification

    g.beginFill(this.fillColor, 1);
    g.moveTo(this._smoothedMouseX + this._L1Cos1, this._smoothedMouseY + this._L1Sin1);
    g.lineTo(x + this._taper*this._L1Cos1, y + this._taper*this._L1Sin1);
    g.lineTo(x - this._taper*this._L1Cos1, y - this._taper*this._L1Sin1);
    g.lineTo(this._smoothedMouseX - this._L1Cos1, this._smoothedMouseY - this._L1Sin1);
    g.lineTo(this._smoothedMouseX + this._L1Cos1, this._smoothedMouseY + this._L1Sin1);
    g.endFill();
  }
}
