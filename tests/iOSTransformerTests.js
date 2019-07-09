var transformer = require("../core/Transformer.js")['ios'];
var EOL = require('os').EOL;

exports.testComment = function (test) {
    var result = transformer.transformComment('un commentaire');

    test.equal('// un commentaire', result);

    test.done();
};

exports.testKeyValue = function (test) {
    var line = transformer.transformKeyValue('ma_cle', 'La valeur', false);
    test.equal('"ma_cle" = "La valeur";', line);

    test.done();
};

exports.testEscapeQuote = function (test) {
    var line = transformer.transformKeyValue('ma_cle', 'La "valeur"', false);
    test.equal('"ma_cle" = "La \\"valeur\\"";', line);

    test.done();
};

exports.testInsert_WhenNotEmpty_ShouldInsertAfter = function (test) {
    var result = transformer.insert('// header' + EOL + '"aa" = "bb";' + EOL, 'à insérer');
    test.equal('// header' + EOL + '"aa" = "bb";' + EOL + EOL + EOL + transformer.AUTOGENERATED_TAG + EOL + 'à insérer' + EOL, result);

    test.done();
};

exports.testInsert_WhenHasAutoGeneratedTag_ShouldReplaceIt = function (test) {
    var result = transformer.insert('// header' + EOL + transformer.AUTOGENERATED_TAG + EOL + 'à effacer', 'à insérer');
    test.equal('// header' + EOL
        + '// AUTO-GENERATED' + EOL
        + 'à effacer' + EOL + EOL
        + '// AUTO-GENERATED' + EOL
        + 'à insérer' + EOL, result);

    test.done();
};