/**
 * Copyright 2019 Jim Armstrong (www.algorithmist.net)
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
 * Main App component that illustrates usage of the Freehand drawing directive
 *
 * Author Jim Armstrong (www.algorithmist.net)
 *
 * Version 1.0
 *
 */
import {
  Component,
  OnInit,
  ViewChild
} from '@angular/core';

import { FreehandDrawingDirective } from './drawing/freehand-drawing.directive';

@Component({
  selector: 'app-root',

  templateUrl: './app.component.html',

  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit
{
  // cache strokes?
  public cacheStrokes: boolean;

  // store x- and y-coordinates of stroke
  private _freehandX: Array<number>;
  private _freehandY: Array<number>;

  // Freehand Drawing Area
  @ViewChild(FreehandDrawingDirective, {static: true})
  private _freehand: FreehandDrawingDirective;

  // Sample x-y coordinates that represent mouse movement to simulate a stroke
  private _sampleX: number[] = [150, 152, 157, 166, 174, 187, 201, 213, 223, 229, 230, 232, 231, 227, 218, 210, 205, 197, 196, 195, 195, 196, 196];

  private _sampleY: number[] = [101, 101, 101, 101, 101, 101, 101, 101, 103, 104, 106, 108, 111, 116, 122, 128, 132, 136, 137, 138, 139, 139, 139];

  constructor()
  {
    // Set to true to enable recording of x-y coordinates in the drawing area
    this.cacheStrokes = false;

    this._freehandX = new Array<number>();
    this._freehandY = new Array<number>();
  }

  public ngOnInit(): void
  {
    /* Uncomment to manually create a stroke
    const n: number = this._sampleX.length;

    if (n < 3) {
      return;
    }

    let i: number;

    this._freehand.beginStrokeAt(this._sampleX[0], this._sampleY[0]);

    for (i = 1; i < n-1; ++i) {
      this._freehand.updateStroke(this._sampleX[i], this._sampleY[i]);
    }

    this._freehand.endStrokeAt(this._sampleX[n-1], this._sampleY[n-1])
    */
  }

  /**
   * Execute whenever a stroke is initiated
   */
  public onBeginStroke(): void
  {
    if (this.cacheStrokes)
    {
      this._freehandX.length = 0;
      this._freehandY.length = 0;
    }
  }

  /**
   * Execute whenever a stroke is terminated
   */
  public onEndStroke(): void
  {
    // Access the sequence of x- and y-coordinates that define the current stroke
    if (this.cacheStrokes)
    {
      this._freehandX = this._freehand.x;
      this._freehandY = this._freehand.y;
    }
  }

  /**
   * Execute when the user clicks the 'Clear' button; clear the freehand drawing area
   */
  public onClear(): void
  {
    this._freehand.clear();
  }
}
