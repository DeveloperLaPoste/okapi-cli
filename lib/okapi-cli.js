'use strict';

const Promise = require('bluebird');
const yargs = require('yargs');
const util = require('util');
const path = require('path');
const chalk = require('chalk');
const tty = require('tty');
const _ = require('lodash');
const prettyjson = require('prettyjson');
const okapiSdk = require('laposte-okapi-sdk');
const pkg = require('../package.json');
const isatty = tty.isatty(process.stdout.fd);
const helper = require('./helper');
const print = helper.print;
const settings = require('./settings');
const fs = Promise.promisifyAll(require('fs'));
const YAML = require('yamljs');
const isWin = /^win/.test(process.platform);

chalk.enabled = isatty;

const cmdName = 'oka';

const cmd = yargs
  .usage(util.format(
    'Usage: %s [%s] %s [%s]',
    chalk.bold(cmdName),
    chalk.bold.yellow('method'),
    chalk.bold('uri'),
    chalk.cyan.bold('options'))
  )
  .wrap(120)
  .options({
    'env': {
      alias: 'e',
      describe: chalk.cyan.bold('get/set okapi env'),
      type: 'string'
    },
    'baseurl': {
      alias: 'u',
      describe: chalk.cyan.bold('get/set okapi base URL'),
      type: 'string'
    },
    'key': {
      alias: 'k',
      describe: chalk.cyan.bold('get/set okapi application key'),
      type: 'string'
    },
    'save': {
      alias: 's',
      describe: chalk.cyan.bold('save settings: application key, baseUrl, ignoreSSL'),
      type: 'boolean'
    },
    'data': {
      alias: 'd',
      describe: chalk.cyan.bold('set request JSON payload, accept : direct data or file'),
      type: 'string'
    },
    'query': {
      alias: 'q',
      describe: chalk.cyan.bold('set request query string params (format : key=value&...)'),
      type: 'string'
    },
    'headers': {
      alias: 'H',
      describe: chalk.cyan.bold('extra request header'),
      type: 'string'
    },
    'yaml': {
      alias: 'Y',
      describe: chalk.cyan.bold('display result in pretty YAML format'),
      type: 'boolean'
    },
    'status': {
      alias: 't',
      describe: chalk.cyan.bold('display status code'),
      type: 'boolean'
    },
    'showheaders': {
      alias: 'h',
      describe: chalk.cyan.bold('display status code'),
      type: 'boolean'
    },
    'version': {
      alias: 'v',
      describe: chalk.cyan.bold('show version'),
      type: 'boolean'
    },
    'reset': {
      alias: 'R',
      describe: chalk.cyan.bold('reset settings to default'),
      type: 'boolean'
    },
    'ignoressl': {
      alias: 'I',
      describe: chalk.cyan.bold('ignore SSL certificate error'),
      type: 'boolean'
    }
  })
  .example(chalk.bold(`${cmdName} post niceapi/v1/niceresource -d 'foo:"bar"'`))
  .epilogue('for more information, contact developer@laposte.io');
const exit = (exitCode = 0) => Promise.resolve(exitCode);
const processCmd = (args, stdinContent, cb) => Promise.resolve()
  .then(() => {
    if (args) { // used by okapi bots
      cmd.parse(args);
    }
    const argv = cmd.argv;
    if (argv.version) {
      print.out(chalk.bold(pkg.version));
      return exit();
    }
    if (argv.reset) {
      settings.delete();
      print.err(chalk.yellow.bold('reset done'));
      return exit();
    }
    let envName = settings.value.env;
    if (typeof argv.env !== 'undefined') {
      if (argv.env) {
        if (settings.value.baseUris.hasOwnProperty(argv.env)) {
          envName = argv.env;
        } else {
          for (const key in settings.value.baseUris) {
            if (!settings.value.baseUris.hasOwnProperty(key)) {
              continue;
            }
            if (key.toLowerCase().indexOf(argv.env.toLowerCase()) !== -1) {
              envName = key;
              break;
            }
          }
        }
        if (envName) {
          settings.value.env = envName;
          settings.value[settings.value.env] = settings.value[settings.value.env] || {};
        } else {
          print.err(chalk.red.bold(util.format('environment %s not supported', argv.env)));
          return exit(1);
        }
      }
      if (argv._.length < 1) {
        print.out(Object.keys(settings.value.baseUris)
          .map(item => util
            .format(
              '[%s] %s',
              item === settings.value.env ? chalk.cyan.bold('o') : ' ',
              chalk.bold(item)
            ))
          .join('\n'));
        settings.save();
        return exit();
      }
    }
    const curEnv = settings.value[settings.value.env] || {};
    if (typeof argv.baseurl !== 'undefined') {
      if (argv.baseurl === '') {
        print.out(chalk.cyan.bold(curEnv.baseUrl || 'https://api.laposte.fr'));
        return exit();
      }
      curEnv.baseUrl = argv.baseurl;
    }
    let hasAuthorization = false;
    if (argv.headers) {
      (Array.isArray(argv.headers) ? argv.headers : [argv.headers]).forEach(header => {
        header = header.split(':');
        const key = header[0] && header[0].trim();
        const value = header[1] && header[1].trim();
        if (key && value) {
          oka.headers({[key]: value});
          if (key.toLowerCase() === 'authorization') {
            hasAuthorization = true;
          }
        }
      });
    }
    if (typeof argv.key !== 'undefined') {
      if (argv.key === '') {
        print.out(chalk.cyan.bold(curEnv.appKey));
        return exit();
      }
      curEnv.appKey = argv.key;
    }
    if (typeof argv.status !== 'undefined') {
      curEnv.status = argv.status;
    }
    if (typeof argv.ignoressl !== 'undefined') {
      curEnv.ignoressl = argv.ignoressl;
    }
    if (argv.save) {
      const toggles = _.pick(_.pick(argv, ['showheaders', 'status', 'ignoressl', 'yaml']), _.isBoolean);
      Object.assign(curEnv, toggles);
      settings.save();
      print.err(chalk.yellow.bold('options successfully saved'));
      return exit();
    }
    if (argv._.length < 1) {
      return Promise
        .fromCallback(cb => {
          cmd.showHelp(help => {
            print.err(help);
            cb();
          });
        })
        .then(() => exit(1));
    }
    const method = argv._.length > 1 ? _.first(argv._) : 'get';
    const uri = _.last(argv._);
    const oka = okapiSdk({
      baseUrl: curEnv.baseUrl || settings.value.baseUris[envName],
      appKey: curEnv.appKey,
      strictSSL: !curEnv.ignoressl
    });
    oka.uri(uri);
    const data = argv.data || stdinContent;
    if (data) {
      try {
        const ext = path.extname(data);
        const content = fs.readFileSync(data, 'utf8');
        if (ext === '.json' || ext === '.js') {
          oka.body(JSON.parse(content));
        } else if (ext === '.yml' || ext === '.yaml') {
          oka.body(YAML.parse(content));
        } else {
          oka.form(helper.parseQs(content));
        }
      } catch (err) {
        const result = data && helper.parseJson(data);
        if (result) {
          oka.body(result);
        } else {
          oka.form(helper.parseQs(data));
        }
      }
    }
    const qs = argv.query && helper.parseQs(argv.query);
    if (qs) {
      oka.query(qs);
    }
    if (argv.tocurl) {
      const okaInfo = oka.info();
      const uri = oka.toUrl() + (
          okaInfo.qs ?
          '?' + Object.keys(okaInfo.qs).map(key => [key, encodeURIComponent(okaInfo.qs[key])]
            .join('=')).join('&') : '');
      const curlCmd = [
        [util.format('curl -%si -X %s "%s"', okaInfo.strictSSL ? '' : 'k'), okaInfo.method.toUpperCase(), uri],
        [
          '-H "Content-Type: %s"',
          okaInfo.json ? 'application/json' : (okaInfo.form ? 'application/x-www-form-urlencoded' : 'text/plain')
        ]
      ];
      if (okaInfo.headers) {
        for (const name in okaInfo.headers) {
          const lcName = name.toLowerCase();
          if (lcName === 'content-type') {
            break;
          }
          const value = okaInfo.headers[name];
          curlCmd.push(['-H "%s: %s"', name, value]);
        }
      }
      if (!hasAuthorization && okaInfo.appKey) {
        curlCmd.push(['-H "%s: %s"', 'X-Okapi-Key', okaInfo.appKey]);
      }
      curlCmd.push([okaInfo.auth && util.format('-u "%s:%s"', okaInfo.auth.user, okaInfo.auth.pass)]);
      if (okaInfo.form) {
        _.forIn(okaInfo.form, (value, name) => {
          curlCmd.push([`-d "${name}=${value}"`]);
        });
      } else if (okaInfo.body) {
        curlCmd.push([util.format(
          '-d \'%s\'',
          JSON.stringify(okaInfo.body)
        )]);
      }
      const cmdSep = isWin ? ' ' : ' \\\n\t';
      const cmdString = _.compact(curlCmd.map(item => {
        item = _.compact(item);
        return item.length ? util.format.apply(null, item) : null;
      })).join(cmdSep);
      print.out(chalk.bold(cmdString));
      return exit();
    }
    return oka[method]()
      .spread((data, res) => {
        let content = null;
        if (argv.status) {
          content = content || {};
          Object.assign(content, {statusCode: res.statusCode});
        }
        if (argv.headers) {
          content = content || {};
          Object.assign(content, {headers: res.headers});
        }
        if (content) {
          data = Object.assign(content, {body: data});
        }
        const beautifier = opt => {
          let data = Array.isArray(opt.data) ? opt.data : helper.sortDataByKey(opt.data);
          if (opt.prefix) {
            const result = {};
            result[opt.prefix] = data;
            data = result;
          }
          if (argv.yaml) {
            return prettyjson.render(data, isatty &&
            opt.error ? {
              keysColor: 'red',
              stringColor: 'bold',
              numberColor: 'bold'
            } : {
              stringColor: 'bold', numberColor: 'yellow'
            });
          }
          if (typeof data !== 'object') {
            return data ? chalk.bold(data) : chalk.cyan.bold('empty');
          }
          return chalk.bold(JSON.stringify(data, null, 2));
        };
        print.out(beautifier({data}));
      })
      .catch(err => {
        const msg = err.body ? JSON.stringify(err.body, null, 2) : err;
        print.err(chalk.red.bold(msg) + (err.statusCode && curEnv.status ? ` (status code : ${err.statusCode})` : ''));
        return exit(1);
      });
  })
  .catch(err => {
    print.err(err.stack);
    return exit(1);
  })
  .asCallback(cb);

if (!module.parent || path.relative(__dirname, module.parent.filename) === '../bin/oka') {
  print.init();
  const getUserHome = () => process.env[(process.platform === 'win32') ? 'USERPROFILE' : 'HOME'];
  settings.path = path.join(getUserHome(), '.okapi-cli.yml');
  settings.load();
  let stdinContent;
  const readStdinContent = () => new Promise((resolve, reject) => {
    let content = '';
    const finish = () => {
      process.stdin.removeAllListeners();
      process.stdin.destroy();
      resolve(content);
    };
    process.stdin.setEncoding('utf8');
    process.stdin.on('readable', () => {
      const chunk = process.stdin.read();
      if (chunk === null) {
        finish();
      }
      content += chunk;
    });
    process.stdin.on('error', err => {
      reject(err);
    });
    process.stdin.on('end', finish);
  });
  const exit = (exitCode = 0) => {
    process.nextTick(() => {
      process.exit(exitCode);
    });
  };
  return Promise.resolve()
    .then(() => {
      if (isatty) {
        return readStdinContent()
          .then(content => {
            stdinContent = content;
          });
      }
    })
    .then(() => {
      processCmd(null, stdinContent, exit);
    });
}

exports = module.exports = (text, opt, cb) => Promise.resolve()
  .then(() => {
    print.init({stdout: opt.stdout, stderr: opt.stderr});
    Object.assign(settings.value, _.omit(opt, ['stdout', 'stderr']));
    return processCmd(_.compact(text.split(' ')));
  })
  .asCallback((err, result) => cb(result));
