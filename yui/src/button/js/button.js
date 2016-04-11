// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * @package    atto_multilang2
 * @copyright  2015 onwards Julen Pardo & Mondragon Unibertsitatea
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * @module moodle-atto_multilang2-button
 */

var CLASSES = {
        TAG: 'filter-multilang-tag'
    },

    LANG_WILDCARD = '%lang',
    CONTENT_WILDCARD = '%content',
    ATTR_LANGUAGES = 'languages',
    ATTR_CAPABILITY = 'capability',
    DEFAULT_LANGUAGE = '{"en":"English (en)"}',
    OPENING_SPAN = '<span class="' + CLASSES.TAG + '">',
    TEMPLATE = '' +
        '&nbsp;' + OPENING_SPAN + '{mlang ' + LANG_WILDCARD + '}</span>' +
        CONTENT_WILDCARD +
        OPENING_SPAN + '{mlang}</span>&nbsp;';

/**
 * Atto text editor multilanguage plugin.
 *
 * @namespace M.atto_multilang2
 * @class button
 * @extends M.editor_atto.EditorPlugin
 */

Y.namespace('M.atto_multilang2').Button = Y.Base.create('button', Y.M.editor_atto.EditorPlugin, [], {

    initializer: function() {
        var hascapability = this.get(ATTR_CAPABILITY),
            toolbarItems = [];

        if (hascapability) {
            this._decorateTagsOnInit();
            toolbarItems = this._initializeToolbarItems();

            this.addToolbarMenu({
                globalItemConfig: {
                    callback: this._addTags
                },
                icon: 'icon',
                iconComponent: 'atto_multilang2',
                items: toolbarItems
            });

            this.get('host').on('atto:selectionchanged', this._checkSelectionChange, this);
            this._setSubmitListener();
        }
    },

    /**
     * Initializes the toolbar items, which will be the installed languages,
     * received as parameter.
     *
     * @method _initializeToolbarItems
     * @private
     * @return {Array} installed language strings
     */
    _initializeToolbarItems: function() {
        var toolbarItems = [],
            languages,
            langCode;

        languages = JSON.parse(this.get(ATTR_LANGUAGES));

        for (langCode in languages) {
            if (languages.hasOwnProperty(langCode)) {
                toolbarItems.push({
                    text: languages[langCode],
                    callbackArgs: langCode
                });
            }
        }

        return toolbarItems;
    },

    /**
     * Retrieves the selected text, wraps it with the multilang tags,
     * and replaces the selected text in the editor with with it.
     *
     * If there is no content selected, a "&nbsp;" will be inserted; otherwhise,
     * it's impossible to place the cursor inside the {mlang} tags.
     *
     * @method _addTags
     * @param {EventFacade} e
     * @param {string} langCode the language code
     * @private
     */
    _addTags: function(e, langCode) {
        var selection,
            host = this.get('host'),
            taggedContent = TEMPLATE,
            content;

        selection = this._getSelectionHTML();
        content = (host.getSelection().toString().length === 0) ? '&nbsp;' : selection;

        taggedContent = taggedContent.replace(LANG_WILDCARD, langCode);
        taggedContent = taggedContent.replace(CONTENT_WILDCARD, content);

        host.insertContentAtFocusPoint(taggedContent);

        this.markUpdated();
    },

    /**
     * Retrieves selected text with its HTML.
     * Took from: http://stackoverflow.com/questions/4176923/html-of-selected-text/4177234#4177234
     *
     * @method _getSelectionHTML
     * @private
     * @return {string} selected text's html; empty if nothing selected
     */
    _getSelectionHTML: function() {
        var html = '',
            selection,
            container,
            index,
            lenght;

        if (typeof window.getSelection !== 'undefined') {
            selection = window.getSelection();

            if (selection.rangeCount) {
                container = document.createElement('div');
                for (index = 0, lenght = selection.rangeCount; index < lenght; ++index) {
                    container.appendChild(selection.getRangeAt(index).cloneContents());
                }
                html = container.innerHTML;
            }

        } else if (typeof document.selection !== 'undefined') {
            if (document.selection.type === 'Text') {
                html = document.selection.createRange().htmlText;
            }
        }

        return html;
    },
    /**
     * Listens to every change of the text cursor in the text area. If the
     * cursor is placed within a multilang tag, the whole tag is selected.
     *
     * @method _checkSelectionChange
     * @private
     */
    _checkSelectionChange: function() {
        var host = this.get('host'),
            node = host.getSelectionParentNode(),
            nodeValue = Y.one(node).get('text'),
            isTextNode,
            isLangTag;

        isTextNode = Y.one(node).toString().indexOf('#text') > - 1;
        isLangTag = (nodeValue.match(/\{mlang/g).length === 1);

        if (isTextNode && isLangTag) {
            host.setSelection(host.getSelectionFromNode(Y.one(node)));
        }
    },

    /**
     * Sets the submit listener to the function that finds the spaned {mlang} tags.
     *
     * @method _setSubmitListener
     * @private
     */
    _setSubmitListener: function() {
        var submitbutton = Y.one('#id_submitbutton');

        submitbutton.on('click', this._cleanTagsOnSubmit, this);
    },

    /**
     * Cleans the <span> tags around the {mlang} tags when the form is submitted.
     * Is necessary to prevent the default action first (the form submission) to
     * start working. When finished, with "detach", the default submit listener
     * is restored, so the form can be submitted.
     *
     * @method _cleanTagsOnSubmit
     * @param {EventFacade} e
     * @private
     */
    _cleanTagsOnSubmit: function(e) {
        var submitbutton = Y.one('#id_submitbutton'),
            textarea,
            innerHTML,
            spanedmlangtags,
            spanedmlangtag,
            index,
            cleanmlangtag,
            regularExpression;

        e.preventDefault();

        textarea = Y.one('#id_messageeditable');
        innerHTML = textarea.get('innerHTML');

        regularExpression = new RegExp(OPENING_SPAN + '.*?' + '</span>', 'g');
        spanedmlangtags = innerHTML.match(regularExpression);

        if (spanedmlangtags !== null) {
            for (index = 0; index < spanedmlangtags.length; index++) {
                spanedmlangtag = spanedmlangtags[index];
                cleanmlangtag = spanedmlangtag.replace(OPENING_SPAN, '');

                cleanmlangtag = cleanmlangtag.replace('</span>', '');

                innerHTML = innerHTML.replace(spanedmlangtag, cleanmlangtag);
            }

            textarea.set('innerHTML', innerHTML);

            this.markUpdated();
        }

        this.detach();

        submitbutton.simulate('click');
    },

    /**
     * Adds the <span> tags to the {mlang} tags when the editor is loaded.
     * In this case, we DON'T HAVE TO CALL TO markUpdated(). Why? Honestly,
     * I don't know. But, if we call it after setting the HTML, the {mlang}
     * tags flicker with the decoration, and returns to their original state.
     *
     * @method _decorateTagsOnInit
     * @private
     */
    _decorateTagsOnInit: function() {
        var textarea = Y.one('#id_messageeditable'),
            innerHTML = textarea.get('innerHTML'),
            regularExpression,
            mlangtags,
            mlangtag,
            index,
            decoratedmlangtag;

        regularExpression = new RegExp('{mlang.*?}', 'g');
        mlangtags = innerHTML.match(regularExpression);

        if (mlangtags !== null) {
            for (index = 0; index < mlangtags.length; index++) {
                mlangtag = mlangtags[index];

                decoratedmlangtag = OPENING_SPAN + mlangtag + '</span>';

                innerHTML = innerHTML.replace(mlangtag, decoratedmlangtag);
            }

            textarea.set('innerHTML', innerHTML);
        }
    }

}, {
    ATTRS: {
        /**
         * The list of installed languages
         *
         * @attribute languages
         * @type array
         * @default {"en":"English (en)"}
         */
        languages: DEFAULT_LANGUAGE,
        capability: true
    }
});
