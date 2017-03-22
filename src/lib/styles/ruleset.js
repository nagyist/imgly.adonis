import { hashObject, resolveStylesObject, deepMerge } from '../utils'
import Declaration from './declaration'
import extensions from './extensions'

export default class Ruleset {
  constructor (adonis, selector, styles, options) {
    this._options = options

    this._adonis = adonis
    this._selector = selector
    this._styles = styles
    this._resolvedStyles = resolveStylesObject(this._styles, this._options.theme)

    const { hashedStyles } = this._adonis.getOptions()
    this._hash = hashedStyles ? this._styles : hashObject(this._styles)

    const { subRulesets, declarations } = this._parseStyles()
    this._subRulesets = subRulesets
    this._declarations = declarations
  }

  /**
   * If any registered extension resolves the given key to a sub ruleset, this method
   * returns the new Ruleset
   * @param  {String} key
   * @param  {String|Object} value
   * @return {Ruleset}
   * @private
   */
  _getSubRuleset (key, value) {
    const { minified } = this._adonis.getOptions()

    let subRuleset = null
    const generateSubRuleset = (newSelector, parentSelector) => {
      const options = deepMerge(this._options, {
        parentSelector
      })
      subRuleset = new Ruleset(this._adonis, newSelector, value, options)
    }

    for (let i = 0; i < extensions.length; i++) {
      const extension = extensions[i]
      extension(key, this._selector, generateSubRuleset, minified)
      if (subRuleset) return subRuleset
    }
  }

  /**
   * Parses this ruleset's styles object and returns the parsed declarations and sub rulesets
   * @return {Object}
   * @private
   */
  _parseStyles () {
    const subRulesets = []
    const declarations = []
    for (let key in this._resolvedStyles) {
      const value = this._resolvedStyles[key]
      const subRuleset = this._getSubRuleset(key, value)
      if (subRuleset) {
        subRulesets.push(subRuleset, subRuleset.getSubRulesets())
      } else {
        declarations.push(new Declaration(this._adonis, key, value))
      }
    }
    return { subRulesets, declarations }
  }

  /**
   * Returns the CSS string for this ruleset
   * @return {String}
   */
  toCSS () {
    const { minified } = this._adonis.getOptions()

    if (this._declarations.length === 0) return null

    let css = ''
    let indentation = ''
    if (this._options.parentSelector) {
      css += this._options.parentSelector + (minified ? '{' : ' {\n')
      indentation = '  '
    }

    css += indentation + this._selector + (minified ? '{' : ' {\n')
    this._declarations.forEach(rule => {
      css += indentation + rule.toCSS() + (minified ? '' : '\n')
    })
    css += indentation + '}'

    if (this._options.parentSelector) {
      css += minified ? '}' : '\n}'
    }
    return css
  }

  /**
   * Returns this ruleset's sub rulesets
   * @return {Ruleset[]}
   */
  getSubRulesets () {
    return this._subRulesets
  }
}
