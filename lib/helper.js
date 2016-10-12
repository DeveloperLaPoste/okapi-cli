'use strict';

const jsonic = require('jsonic');
const util = require('util');
const _ = require('lodash');

exports.parseJson = s => {
  if (Array.isArray(s)) {
    return;
  }
  if (typeof s === 'string') {
    try { // try to parse JSON if possible
      return JSON.parse(s);
    } catch (err) {
      // empty
    }
    try {
      return jsonic(s.charAt(0) === '{' ? s : util.format('{%s}', s));
    } catch (err) {
      // empty
    }
  }
};

exports.parseQs = data => (Array.isArray(data) ? data : [data])
  .reduce((result, query) => query.split('&')
    .reduce((result, item) => {
      const parts = item.split(/[=:]/).map(item => item.trim());
      return Object.assign(result, {[parts[0]]: parts[1]});
    }, result)
    , {});

exports.sortDataByKey = data => { // sort objects by key names
  if (typeof data !== 'object' || !data) {
    return data;
  }
  const isArray = Array.isArray(data) && typeof _.first(data) === 'object';
  let keys, result;
  if (isArray) {
    data.forEach(item => { // scan prop names in all objects
      keys = _.union(keys || [], Object.keys(item));
    });
  } else {
    keys = Object.keys(data);
  }
  if (!keys) {
    return data;
  }
  keys = keys.sort();
  if (keys.indexOf('id') !== -1) { // move 'id' prop to 1st place
    keys.splice(keys.indexOf('id'), 1);
    keys.splice(0, 0, 'id');
  }
  const sortObjectByKey = (o, keys) => { // sort object by key names
    if (typeof o !== 'object' || !o) {
      return o;
    }
    const result = {};
    keys.forEach(key => {
      if (typeof o[key] === 'undefined') {
        return;
      }
      result[key] = o[key];
    });
    return _.defaults(result, o);
  };
  if (isArray) { // populate result
    data.forEach(item => {
      result = result || [];
      result.push(sortObjectByKey(item, keys));
    });
  } else {
    result = sortObjectByKey(data, keys);
  }
  return result || data;
};

exports.print = {
  init(opt) {
    opt = opt || {};
    this.stdout = opt.stdout || process.stdout;
    this.stderr = opt.stderr || process.stderr;
  },
  out(...args) {
    const msg = util.format(...args);
    this.stdout.write(msg + '\n');
  },
  err(...args) {
    const msg = util.format(...args);
    this.stderr.write(msg + '\n');
  }
};
