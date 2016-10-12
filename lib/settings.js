'use strict';

const fs = require('fs');
const YAML = require('yamljs');

exports = module.exports = {
  value: {
    baseUris: {production: 'https://api.laposte.fr'},
    env: 'production'
  },
  delete() {
    if (!this.path) {
      return false;
    }
    fs.unlinkSync(this.path);
  },
  load() {
    if (!this.path) {
      return false;
    }
    try {
      this.value = YAML.load(this.path);
      this.value = this.value || {};
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.warn('settings file "%s" does not exist', this.path);
      } else {
        console.error(err);
      }
      return false;
    }
  },
  save() {
    if (!this.path) {
      return false;
    }
    try {
      fs.chmodSync(this.path, '600');
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }
    fs.writeFileSync(this.path, YAML.stringify(this.value, 3));
    fs.chmodSync(this.path, '400');
    return true;
  }
};
