import { ADD_LINE } from './const';

function action(positions, color, lineWidth) {
  return { type: ADD_LINE, positions, color, lineWidth };
}

module.exports = action;
