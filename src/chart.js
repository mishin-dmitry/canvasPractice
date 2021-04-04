import { toDate, isOver, line, circle, computeBoundaries, css } from './utils';
import { tooltip } from './tooltip';

const WIDTH = 600;
const HEIGHT = 200;
const DPI_WIDTH = WIDTH * 2;
const DPI_HEIGHT = HEIGHT * 2;
const ROWS_COUNT = 5;
const PADDING = 40;
const VIEW_HEIGHT = DPI_HEIGHT - PADDING * 2;
const VIEW_WIDTH = DPI_WIDTH;

// Function for init schedule
export function chart(root, data) {
  // draw in 2d
  const canvas = root.querySelector('canvas');
  const context = canvas.getContext('2d');
  const ttp = tooltip(root.querySelector('[data-el="tooltip"]'));
  console.log(ttp);
  let reqAnimFrame;

  // canvas sizes
  css(canvas, {
    width: WIDTH + 'px',
    height: HEIGHT + 'px'
  });

  // for smooth graphics
  canvas.width = DPI_WIDTH;
  canvas.height = DPI_HEIGHT;

  // Handle changes only if x changed
  const proxy = new Proxy({}, {
    set(...args) {
      const result = Reflect.set(...args);

      reqAnimFrame = requestAnimationFrame(paint);

      return result;
    }
  });

  function mousemove({ clientX, clientY }) {
    const { left, top } = canvas.getBoundingClientRect();

    proxy.mouse = {
      x: (clientX - left) * 2,
      tooltip: {
        left: clientX - left,
        top: clientY - top
      }
    }
  }

  function mouseleave() {
    proxy.mouse = null;
    ttp.hide();
  }

  canvas.addEventListener('mousemove', mousemove);
  canvas.addEventListener('mouseleave', mouseleave);

  function clearCanvas() {
    context.clearRect(0, 0, DPI_WIDTH, DPI_HEIGHT);
  }

  function paint() {
    clearCanvas();

    const [yMin, yMax] = computeBoundaries(data);
    const yRation = VIEW_HEIGHT / (yMax - yMin);
    const xRation = VIEW_WIDTH / (data.columns[0].length - 2);

    // Columns for axis Y
    const yData = data.columns.filter(col => data.types[col[0]] === 'line');

    const xData = data.columns.filter(col => data.types[col[0]] !== 'line')[0];

    yAxis(yMin, yMax);
    xAxis(xData, yData, xRation);

    yData
      .map(toCoords(xRation, yRation))
      .forEach((coords, index) => {
        const color = data.colors[yData[index][0]];

        line(context, coords, { color });

        for (const [x, y] of coords) {
          if (isOver(proxy.mouse, x, coords.length, DPI_WIDTH)) {
            circle(context, [x, y], color);
            break;
          }
        }
      });
  }

  function yAxis(yMin, yMax) {
    const step = VIEW_HEIGHT / ROWS_COUNT;
    const textStep = (yMax - yMin) / ROWS_COUNT;

    context.beginPath();
    context.strokeStyle = '#bbb';
    context.lineWidth = 1;
    context.font = 'normal 20px Helvetica, sans-serif';
    context.fillStyle = '#96a2aa';
    for (let i = 1; i <= ROWS_COUNT; i++) {
      // coord y
      const y = step * i;
      const text = Math.round(yMax - textStep * i);

      context.fillText(text.toString(), 5, y + PADDING - 10);

      // moving without connect
      context.moveTo(0, y + PADDING);

      context.lineTo(DPI_WIDTH, y + PADDING);
    }

    context.stroke();
    context.closePath();
  }

  function xAxis(xData, yData, xRation) {
    const labelsCount = 6;

    // step between labels
    const step = Math.round(xData.length / labelsCount);

    context.beginPath();

    for (let i = 1; i < xData.length; i++) {
      const x = i * xRation;

      if ((i - 1) % step === 0) {
        const text = toDate(xData[i]);
        context.fillText(text.toString(), x, DPI_HEIGHT - 10);
      }

      if (isOver(proxy.mouse, x, xData.length, DPI_WIDTH)) {
        context.save();

        context.moveTo(x, PADDING / 2)
        context.lineTo(x, DPI_HEIGHT - PADDING);

        context.restore();

        ttp.show(proxy.mouse.tooltip, {
          title: toDate(xData[i]),
          items: yData.map(col => ({
            color: data.colors[col[0]],
            name: data.names[col[0]],
            value: col[i + 1]
          }))
        });
      }
    }

    context.stroke();
    context.closePath();
  }

  return {
    init() {
      paint();
    },
    destroy() {
      cancelAnimationFrame(reqAnimFrame);
      canvas.removeEventListener('mousemove', mousemove);
      canvas.removeEventListener('mouseleave', mouseleave);
    }
  }
}

function toCoords(xRation, yRation) {
  return col => col
    .map((y, index) => [
      Math.floor((index - 1) * xRation),
      Math.floor(DPI_HEIGHT - PADDING - y *yRation)
    ])
    .filter((_, i) => i !== 0);
}