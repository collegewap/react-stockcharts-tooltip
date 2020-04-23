import React from "react";
import PropTypes from "prop-types";

import { format } from "d3-format";
import { timeFormat } from "d3-time-format";

import { ChartCanvas, Chart } from "react-stockcharts";
import {
  BarSeries,
  CandlestickSeries,
  LineSeries
} from "react-stockcharts/lib/series";
import { XAxis, YAxis } from "react-stockcharts/lib/axes";
import { EdgeIndicator } from "react-stockcharts/lib/coordinates";

import { discontinuousTimeScaleProvider } from "react-stockcharts/lib/scale";
import { HoverTooltip } from "react-stockcharts/lib/tooltip";
import { ema } from "react-stockcharts/lib/indicator";
import { fitWidth } from "react-stockcharts/lib/helper";
import { last, hexToRGBA } from "react-stockcharts/lib/utils";

const dateFormat = timeFormat("%Y-%m-%d");
const numberFormat = format(".2f");

function tooltipContent(ys) {
  return ({ currentItem, xAccessor }) => {
    return {
      x: dateFormat(xAccessor(currentItem)),
      y: [
        {
          label: "Price",
          value: currentItem.close && numberFormat(currentItem.close)
        }
      ].filter(line => line.value)
    };
  };
}

/**
 * Draws a rounded rectangle using the current state of the canvas.
 * If you omit the last three params, it will draw a rectangle
 * outline with a 5 pixel border radius
 * @param {CanvasRenderingContext2D} ctx
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 * @param {Number} [radius = 5] The corner radius; It can also be an object
 *                 to specify different radii for corners
 * @param {Number} [radius.tl = 0] Top left
 * @param {Number} [radius.tr = 0] Top right
 * @param {Number} [radius.br = 0] Bottom right
 * @param {Number} [radius.bl = 0] Bottom left
 * @param {Boolean} [fill = false] Whether to fill the rectangle.
 * @param {Boolean} [stroke = true] Whether to stroke the rectangle.
 */
function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  if (typeof stroke === "undefined") {
    stroke = true;
  }
  if (typeof radius === "undefined") {
    radius = 5;
  }
  if (typeof radius === "number") {
    radius = { tl: radius, tr: radius, br: radius, bl: radius };
  } else {
    var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
    for (var side in defaultRadius) {
      radius[side] = radius[side] || defaultRadius[side];
    }
  }
  ctx.beginPath();
  ctx.moveTo(x + radius.tl, y);
  ctx.lineTo(x + width - radius.tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
  ctx.lineTo(x + width, y + height - radius.br);
  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius.br,
    y + height
  );
  ctx.lineTo(x + radius.bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
  ctx.lineTo(x, y + radius.tl);
  ctx.quadraticCurveTo(x, y, x + radius.tl, y);
  ctx.closePath();
  if (fill) {
    ctx.fill();
  }
  if (stroke) {
    ctx.stroke();
  }
}

function backgroundShapeCanvas(props, { width, height }, ctx) {
  const { fill, stroke, opacity } = props;

  ctx.fillStyle = hexToRGBA(fill, opacity);
  ctx.strokeStyle = stroke;
  roundRect(ctx, 0, 0, width, height, 2, true);
}

const keyValues = ["high", "low"];

class CandleStickChartWithHoverTooltip extends React.Component {
  removeRandomValues(data) {
    return data.map(item => {
      const newItem = { ...item };
      const numberOfDeletion = Math.floor(Math.random() * keyValues.length) + 1;
      for (let i = 0; i < numberOfDeletion; i += 1) {
        const randomKey =
          keyValues[Math.floor(Math.random() * keyValues.length)];
        newItem[randomKey] = undefined;
      }
      return newItem;
    });
  }

  render() {
    let { type, data: initialData, width, ratio } = this.props;

    // remove some of the data to be able to see
    // the tooltip resize
    initialData = this.removeRandomValues(initialData);

    const ema20 = ema()
      .id(0)
      .options({ windowSize: 20 })
      .merge((d, c) => {
        d.ema20 = c;
      })
      .accessor(d => d.ema20);

    const ema50 = ema()
      .id(2)
      .options({ windowSize: 50 })
      .merge((d, c) => {
        d.ema50 = c;
      })
      .accessor(d => d.ema50);

    const margin = { left: 80, right: 80, top: 30, bottom: 50 };

    const calculatedData = ema50(ema20(initialData));
    const xScaleProvider = discontinuousTimeScaleProvider.inputDateAccessor(
      d => d.date
    );
    const { data, xScale, xAccessor, displayXAccessor } = xScaleProvider(
      calculatedData
    );

    const start = xAccessor(last(data));
    const end = xAccessor(data[Math.max(0, data.length - 150)]);
    const xExtents = [start, end];

    return (
      <ChartCanvas
        height={400}
        width={width}
        ratio={ratio}
        margin={margin}
        type={type}
        seriesName="MSFT"
        data={data}
        xScale={xScale}
        xAccessor={xAccessor}
        displayXAccessor={displayXAccessor}
        xExtents={xExtents}
      >
        <Chart
          id={1}
          yExtents={[d => [d.high, d.low], ema20.accessor(), ema50.accessor()]}
          padding={{ top: 10, bottom: 20 }}
        >
          <XAxis axisAt="bottom" orient="bottom" />

          <YAxis axisAt="right" orient="right" ticks={5} />

          <CandlestickSeries />
          <LineSeries yAccessor={ema20.accessor()} stroke={ema20.stroke()} />
          <LineSeries yAccessor={ema50.accessor()} stroke={ema50.stroke()} />

          <EdgeIndicator
            itemType="last"
            orient="right"
            edgeAt="right"
            yAccessor={d => d.close}
            fill={d => (d.close > d.open ? "#6BA583" : "#FF0000")}
          />

          <HoverTooltip
            fontFill="#000000"
            stroke="#295d8a"
            // bgFill= "#0000ff"
            bgFill="#295d8a"
            fill="#f8f8f8"
            bgOpacity="0.3"
            yAccessor={ema50.accessor()}
            tooltipContent={tooltipContent()}
            fontSize={15}
            backgroundShapeCanvas={backgroundShapeCanvas}
          />
        </Chart>
        <Chart
          id={2}
          yExtents={[d => d.volume]}
          height={150}
          origin={(w, h) => [0, h - 150]}
        >
          <YAxis
            axisAt="left"
            orient="left"
            ticks={5}
            tickFormat={format(".2s")}
          />

          <BarSeries
            yAccessor={d => d.volume}
            fill={d => (d.close > d.open ? "#6BA583" : "#FF0000")}
          />
        </Chart>
      </ChartCanvas>
    );
  }
}

CandleStickChartWithHoverTooltip.propTypes = {
  data: PropTypes.array.isRequired,
  width: PropTypes.number.isRequired,
  ratio: PropTypes.number.isRequired,
  type: PropTypes.oneOf(["svg", "hybrid"]).isRequired
};

CandleStickChartWithHoverTooltip.defaultProps = {
  type: "svg"
};
CandleStickChartWithHoverTooltip = fitWidth(CandleStickChartWithHoverTooltip);

export default CandleStickChartWithHoverTooltip;
