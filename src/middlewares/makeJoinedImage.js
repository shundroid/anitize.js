import { TOGGLE_PLAY, UPDATE_THUMBNAIL } from '@actions/const';
import JoinedImage from '@utils/joinedImage';
import History from '@utils/history';

class Joiner {
  canvas = document.createElement('canvas');
  ctx = this.canvas.getContext('2d');
  join(thumbnails, width, height) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    return new Promise(resolve => {
      Promise.all(thumbnails.map(thumbnail => new Promise(_resolve => {
        if (thumbnail) {
          const image = new Image();
          image.onload = () => {
            _resolve(image);
          };
          image.src = thumbnail;
        } else {
          _resolve(new Image(width, height));
        }
      }))).then(images => {
        this.canvas.height = height;
        this.canvas.width = width * images.length;
        for (let index = 0; index < images.length; index++) {
          this.ctx.drawImage(images[index], width * index, 0);
        }

        this.canvas.toBlob(blob => {
          resolve(new JoinedImage(
            this.canvas.toDataURL(),
            blob,
            images.length,
            width,
            height
          ));
        });
      });
    });
  }
}
const joiner = new Joiner();
let lastJoinedFrames = [];
let lastJoinedImage = null;
let waitingAction = null;

function play(next, action, joinedImage) {
  action.joinedImage = joinedImage;
  next(action);
}

function join(store, next, action) {
  const thumbnails = store.getState().canvas.frames.map(frame => frame.thumbnail);
  const { width, height } = store.getState().canvas;
  joiner.join(thumbnails, width, height).then(joinedImage => {
    lastJoinedImage = joinedImage;
    lastJoinedFrames = store.getState().canvas.frames;
    play(next, action, joinedImage);
  });
}

function isNeedToJoin(frames) {
  if (!lastJoinedImage) return true;
  const history = History.compare(0, lastJoinedFrames, frames);
  return history.framesDiff.added.length > 0 ||
    history.framesDiff.removed.length > 0 ||
    history.changedFrames.length > 0;
}

const makeJoinedImage = store => next => action => {
  if (action.type === UPDATE_THUMBNAIL && waitingAction) {
    next(action);
    join(store, next, waitingAction);
    waitingAction = null;
  }
  if (action.type === TOGGLE_PLAY && !store.getState().player.isPlaying) {
    if (action.isNeedWaiting) {
      waitingAction = action;
    } else if (isNeedToJoin(store.getState().canvas.frames)) {
      join(store, next, action);
    } else {
      play(next, action, lastJoinedImage);
    }
  } else {
    next(action);
  }
};

export default makeJoinedImage;
