var _ = require("lodash");

var Graph = require('./objects/graph');
var Pipeline = require('./objects/pipeline');
var Argument = require('./arguments/argument');
var GremlinFunction = require('./functions/function');

module.exports = (function() {
  function GremlinScript(client) {
    this.script = '';
    this.params = {};
    this.client = client;

    // Define a default 'g' getter, returning a Graph
    Object.defineProperty(this, 'g', {
      get: function() {
        var graph = new Graph('g');

        return graph;
      }
    });
  }

  /**
   * Send the script to the server for execution, returning raw results.
   *
   * @param {Function}
   */
  GremlinScript.prototype.exec = function(callback) {
    return this.client.exec(this).nodeify(callback);
  };

  /**
   * Send the script to the server for execution, returning instantiated
   * results.
   *
   * @param {Function}
   */
  GremlinScript.prototype.fetch = function(callback) {
    return this.client.fetch(this).nodeify(callback);
  };

  /**
   * Return a Pipeline object with its own internal GremlinScript object to append
   * string to.
   *
   * @return {Pipeline}
   */
  GremlinScript.prototype._ = function() {
    var gremlin = new GremlinScript(this.client);
    var func = new GremlinFunction('_', arguments);
    gremlin.append(func.toGroovy());

    return new Pipeline(gremlin);
  };

  /**
   * Append an arbitrary string to the script.
   *
   * @private
   * @param {String} script
   */
  GremlinScript.prototype.append = function(script) {
    this.script += script;
  };

  /**
   * Append an arbitrary string to the script as a new line.
   *
   * @public
   * @param {String} line
   */
  GremlinScript.prototype.line = function(line, identifier) {
    var prefix = '';

    if (identifier) {
      line.identifier = identifier;
      prefix = identifier + '=';
    }

    this.script += '\n'+ prefix + line.toGroovy();

    return line;
  };

  /**
   * Append many statements to the script, each as new lines.
   *
   * @public
   */
  GremlinScript.prototype.appendMany = function(statements) {
    var toAppend = _.map(statements, function(s) { return s.toGroovy(); });
    this.script = toAppend.join('\n');
  };

  /**
   * @private
   */
  GremlinScript.prototype.getAppender = function() {
    var self = this;

    function gremlinAppender() {
      _.each(arguments, function(statement) {
        self.line(statement);
      });

      return self;
    }

    /**
     * Proxy some GremlinScript methods/getters
     */
    gremlinAppender.exec = function(callback) {
      return self.exec(callback);
    };

    gremlinAppender.fetch = function(callback) {
      return self.fetch(callback);
    };

    gremlinAppender.line = function() {
      return self.line.apply(self, arguments);
    }

    Object.defineProperty(gremlinAppender, 'script', {
      get: function() {
        return self.script;
      }
    });

    return gremlinAppender;
  };

  return GremlinScript;
})();