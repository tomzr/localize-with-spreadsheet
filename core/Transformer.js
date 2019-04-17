var yaml = require('js-yaml');

var Transformer = {
    transformComment: null,
    transformKeyValue: null,
    insert: function (input, newValues) { /* merge newValues dans input selon la convention de la plateforme (utilisation d'un commentaire pour séparer ce qui est généré */
    }
};
var EOL = require('os').EOL;

var iOSTransformer = {
    transformComment: function (comment) {
        return "// " + comment;
    },
    transformKeyValue: function (key, value, isIOSDictFormat) {
        // Format lines for iOS requirements
        var normalizedValue = value.replace(/%newline%/gi, "\\n");
        normalizedValue = normalizedValue.replace(/"/gi, '\\"');
        normalizedValue = normalizedValue.replace(/%([df])/gi, '\\%$1');
        normalizedValue = normalizedValue.replace(/%s/gi, '\\%@');
        normalizedValue = normalizedValue.replace(/%(\d)\$s/gi, "\\%$1$$@");
        normalizedValue = normalizedValue.replace(/%(\d)\$d/gi, "\\%$1$$d");
        normalizedValue = normalizedValue.replace(/%(\d)\$f/gi, "\\%$1$$f");
        
        normalizedValue = normalizePlurals(normalizedValue);

        if (isIOSDictFormat === true && isPlural(normalizedValue)) {
            var xmlFormat = yaml.safeLoad(normalizedValue);
            return iOSDictFormatGenerator(key, xmlFormat); // Return '.stringdict' format line 
        } 

        if (isIOSDictFormat === false && !isPlural(normalizedValue)) {
            normalizedValue = normalizedValue.replace(/\\%([@df])/gi, "%$1");
            normalizedValue = normalizedValue.replace(/\\%(\d)\$([@df])/gi, "%$1$$$2");
            return '"' + key + '" = "' + removeNewLines(normalizedValue) + '";'; // Return '.string' format line
        }

        return ""
    },
    AUTOGENERATED_TAG: '// AUTO-GENERATED',
    insert: function (input, newValues) {
        return input + "\n\n" + iOSTransformer.AUTOGENERATED_TAG + EOL + newValues + EOL;
    },

    // Add required input in '.stringdict' 
    insertForIOSDictFormat: function (input, newValues) {    
        var header = '<?xml version="1.0" encoding="UTF-8"?>\n' +
                     '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
                     '<plist version="1.0">\n' +
                     '<dict>';
        var tail = '</dict>\n</plist>'

        if (input === "") {
            return header + newValues + tail;
        } 

        var headerLength = header.length
        var tailLength = tail.length
        var editedInput = input.substr(headerLength, input.length - (headerLength + tailLength))

        var output = header + editedInput + newValues + tail;

        return output;
    }
};

var androidTransformer = {
    ANDROID_INDENT: '  ',
    transformComment: function (comment) {
        return androidTransformer.ANDROID_INDENT + "<!-- " + comment + " -->";
    },
    transformKeyValue: function (key, value) {
        const INDENT = androidTransformer.ANDROID_INDENT;

        var normalizedValue = value.replace(/%newline%/gi, "\\n");
        normalizedValue = normalizedValue.replace(/'/gi, "\\'");
        normalizedValue = normalizedValue.replace(/&/gi, "&amp;");
        normalizedValue = normalizedValue.replace(/\u00A0/gi, "\\u00A0");
        normalizedValue = normalizedValue.replace(/([^\.]|^)(\.{3})([^\.]|$)/gi, '$1&#8230;$3');

        normalizedValue = normalizedValue.replace(/%(\d)\$([sdf])/gi, '\\%$1$$$2');
        normalizedValue = normalizedValue.replace(/%([sdf])/gi, '\\%$1');
        
        normalizedValue = normalizePlurals(normalizedValue);

        var output;
        if(isPlural(normalizedValue)) {
            var parsedValue = yaml.safeLoad(normalizedValue);
            
            output = INDENT + '<plurals name="' + key + '">\n';
            for (var quantityKey in parsedValue) {
                output += INDENT + INDENT + '<item quantity="' + quantityKey + '">' + removeNewLines(parsedValue[quantityKey]) + '</item>\n';
            }
            output += INDENT + '</plurals>';
        } else {
            output = INDENT + '<string name="' + key + '">' + removeNewLines(normalizedValue) + '</string>';
        }

        output = output.replace(/\\%(\d)\$([sdf])/gi, '%$1$$$2')
        output = output.replace(/\\%([sdf])/gi, '%$1')

        return output;
    },
    AUTOGENERATED_TAG: '<!-- AUTO-GENERATED -->',
    insert: function (input, newValues) {
        var AUTOGENERATED_TAG = androidTransformer.AUTOGENERATED_TAG;

        if (!input) {
            input = '';
        }

        var output = '';
        var closeTagIndex = input.indexOf('</resources>');
        if (closeTagIndex < 0) {
            output = '<?xml version="1.0" encoding="utf-8"?>' + EOL + '<resources>' + EOL;
        } else {
            var autoGeneratedIndex = input.indexOf(AUTOGENERATED_TAG);
            if (autoGeneratedIndex >= 0) {
                output = input.substr(0, autoGeneratedIndex);
            } else {
                output = input.substr(0, closeTagIndex);
            }
        }

        output += AUTOGENERATED_TAG + EOL + newValues + EOL + '</resources>';

        return output;
    }
};

var jsonTransformer = {
    transformComment: function (comment) {
        return "";
    },
    transformKeyValue: function (key, value) {
        var normalizedValue = value.replace(/%newline%/gi, "\\n");
        normalizedValue = normalizedValue.replace(/"/gi, '\\"');
        normalizedValue = normalizedValue.replace(/%([@df])/gi, '%$1');
        normalizedValue = normalizedValue.replace(/%s/gi, "%@");

        return '  "' + key + '" : "' + normalizedValue + '",';
    },
    AUTOGENERATED_TAG: '',
    insert: function (input, newValues, options) {
        newValues = newValues.substring(0, newValues.length - 1);

        var output = EOL +
                     '{' + EOL +
                     newValues + EOL
                     + '}';

        return output;
    }
};

var dartTransformer = {
    transformComment: function (comment) {
        return "  // " + comment;
    },
    transformKeyValue: function (key, value) {
        var normalizedValue = value.replace(/%newline%/gi, "\\n");
        normalizedValue = normalizedValue.replace(/"/gi, '\\"');
        normalizedValue = normalizedValue.replace(/%([@df])/gi, '%$1');
        normalizedValue = normalizedValue.replace(/%s/gi, "%@");

        return '  "' + key + '" : "' + normalizedValue + '",';
    },
    AUTOGENERATED_TAG: '// AUTO-GENERATED',
    insert: function (input, newValues, options) {
        if (!input) {
            input = '';
        }

        var generatedIndex = input.indexOf(dartTransformer.AUTOGENERATED_TAG);
        if (generatedIndex >= 0) {
            input = input.substr(0, generatedIndex);
        }

        var header = options && options.header ? options.header : '';
        var footer = options && options.footer ? options.footer : '';

        var output = input + dartTransformer.AUTOGENERATED_TAG + EOL +
            header +
            '{' + EOL +
            newValues + EOL
            + '};' + footer;

        return output;
    }
};

var dartTemplateTransformer = {
    transformComment: function (comment) {
        return "  // " + comment;
    },
    transformKeyValue: function (key, value) {
        var normalizedValue = value.replace(/%newline%/gi, "\\n");
        normalizedValue = normalizedValue.replace(/"/gi, '\\"');
        normalizedValue = normalizedValue.replace(/%([@df])/gi, '%$1');
        normalizedValue = normalizedValue.replace(/%s/gi, "%@");

        return '  String get ' + key + ' => get("' + key + '");';
    },
    AUTOGENERATED_TAG: '// AUTO-GENERATED',
    insert: function (input, newValues, options) {
        if (!input) {
            input = '';
        }

        var generatedIndex = input.indexOf(dartTemplateTransformer.AUTOGENERATED_TAG);
        if (generatedIndex >= 0) {
            input = input.substr(0, generatedIndex);
        }

        var className = options && options.className ? options.className : 'T';
        var header = options && options.header ? options.header : 'library core.t';
        var baseClass = options && options.baseClass ? options.baseClass : 'TranslationSet';

        var output = input + dartTemplateTransformer.AUTOGENERATED_TAG + EOL +
            header + EOL + EOL +
            'class ' + className + ' extends ' + baseClass + ' { ' + EOL + EOL +
            '  ' + className + '(values): super(values);' + EOL + EOL +
            newValues + EOL +
            '}';

        return output;
    }
};

//TODO: finish + testing
var dotNetTransformer = {
    transformComment: function(comment) {
        return androidTransformer.transformComment(comment);
    },

    transformKeyValue : function(key, value) {
        //TODO: normalize string + detect format (%s => {0})

         var output = '<data name="' + key + '" xml:space="preserve">' + EOL
                      + '   <value>' + value + '</value>' + EOL
                      +'</data>' + EOL;
    },
    AUTOGENERATED_TAG: '<!-- AUTO-GENERATED -->',
    insert: function (input, newValues) {
        //TODO: use auto-generated tag
        return dotNetHeader + EOL + newValues + '</root>';
    }
};


function setCharAt(str, index, chr) {
    if (index > str.length - 1) return str;
    return str.substr(0, index) + chr + str.substr(index + 1);
}

function isPlural(str) {
    var pluralWords = ["zero :", "one :", "two :", "few :", "many :", "other :"]
    return pluralWords.some(word => str.includes(word))
}

function normalizePlurals(normalizedValue) {
    // /zero *:/ regex matches string with any number of white spaces between 'zero' and ':'
    normalizedValue = normalizedValue.replace(/zero *:/, "zero :");
    normalizedValue = normalizedValue.replace(/one *:/, "one :");
    normalizedValue = normalizedValue.replace(/two *:/, "two :");
    normalizedValue = normalizedValue.replace(/few *:/, "few :");
    normalizedValue = normalizedValue.replace(/many *:/, "many :");
    normalizedValue = normalizedValue.replace(/other *:/, "other :");
    return normalizedValue;
}
function removeNewLines(str) {
	return str.replace(/(\r\n|\n|\r)/gm, "");
}

function iOSDictFormatGenerator(key, value) {
    // Check for required 'other' filed and if exists create xml
    if (value.other === undefined) {
        return
    } 
    else {
        var values = ""
        for (var val in value) {
            var str = value[val]
            str = str.replace(/\\%([@df])/gi, "%$1");
            str = str.replace(/\\%(\d)\$([@df])/gi, "%$1$$$2");

            values += '\t\t\t<key>' + val + '</key>\n'
            values += '\t\t\t<string>' + removeNewLines(str) + '</string>\n'
        }


        var internal = '\t\t\t<key>NSStringFormatSpecTypeKey</key>\n' +
                       '\t\t\t<string>NSStringPluralRuleType</string>\n' +
                       '\t\t\t<key>NSStringFormatValueTypeKey</key>\n' +
                       '\t\t\t<string>d</string>\n' + 
                       values

        var body = '\t\t<key>NSStringLocalizedFormatKey</key>\n' +
                   '\t\t<string>%#@value@</string>\n' +
                   '\t\t<key>value</key>\n' +
                   '\t\t<dict>\n' +
                    internal +
                   '\t\t</dict>\n' 

        var keyOutput = '\t<key>' + key + '</key>';
        var bodyOutput = '\t<dict>\n' + body + '\t</dict>';
    }

    return keyOutput + '\n' + bodyOutput;            
}

module.exports = {'ios': iOSTransformer, 'android': androidTransformer, 'json': jsonTransformer, 'dart': dartTransformer, 'dartTemplate': dartTemplateTransformer, '.net': dotNetTransformer };



var dotNetHeader =
    '<?xml version="1.0" encoding="utf-8"?>' +
    '<root>' +
    '  <xsd:schema id="root" xmlns="" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:msdata="urn:schemas-microsoft-com:xml-msdata">' +
    '    <xsd:import namespace="http://www.w3.org/XML/1998/namespace" />' +
    '    <xsd:element name="root" msdata:IsDataSet="true">' +
    '      <xsd:complexType>' +
    '        <xsd:choice maxOccurs="unbounded">' +
    '          <xsd:element name="metadata">' +
    '            <xsd:complexType>' +
    '              <xsd:sequence>' +
    '                <xsd:element name="value" type="xsd:string" minOccurs="0" />' +
    '              </xsd:sequence>' +
    '              <xsd:attribute name="name" use="required" type="xsd:string" />' +
    '              <xsd:attribute name="type" type="xsd:string" />' +
    '              <xsd:attribute name="mimetype" type="xsd:string" />' +
    '              <xsd:attribute ref="xml:space" />' +
    '            </xsd:complexType>' +
    '          </xsd:element>' +
    '          <xsd:element name="assembly">' +
    '            <xsd:complexType>' +
    '              <xsd:attribute name="alias" type="xsd:string" />' +
    '              <xsd:attribute name="name" type="xsd:string" />' +
    '            </xsd:complexType>' +
    '          </xsd:element>' +
    '          <xsd:element name="data">' +
    '            <xsd:complexType>' +
    '              <xsd:sequence>' +
    '                <xsd:element name="value" type="xsd:string" minOccurs="0" msdata:Ordinal="1" />' +
    '                <xsd:element name="comment" type="xsd:string" minOccurs="0" msdata:Ordinal="2" />' +
    '              </xsd:sequence>' +
    '              <xsd:attribute name="name" type="xsd:string" use="required" msdata:Ordinal="1" />' +
    '              <xsd:attribute name="type" type="xsd:string" msdata:Ordinal="3" />' +
    '              <xsd:attribute name="mimetype" type="xsd:string" msdata:Ordinal="4" />' +
    '              <xsd:attribute ref="xml:space" />' +
    '            </xsd:complexType>' +
    '          </xsd:element>' +
    '          <xsd:element name="resheader">' +
    '            <xsd:complexType>' +
    '              <xsd:sequence>' +
    '                <xsd:element name="value" type="xsd:string" minOccurs="0" msdata:Ordinal="1" />' +
    '              </xsd:sequence>' +
    '              <xsd:attribute name="name" type="xsd:string" use="required" />' +
    '            </xsd:complexType>' +
    '          </xsd:element>' +
    '        </xsd:choice>' +
    '      </xsd:complexType>' +
    '    </xsd:element>' +
    '  </xsd:schema>' +
    '  <resheader name="resmimetype">' +
    '    <value>text/microsoft-resx</value>' +
    '  </resheader>' +
    '  <resheader name="version">' +
    '    <value>2.0</value>' +
    '  </resheader>' +
    '  <resheader name="reader">' +
    '    <value>System.Resources.ResXResourceReader, System.Windows.Forms, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089</value>' +
    '  </resheader>' +
    '  <resheader name="writer">' +
    '    <value>System.Resources.ResXResourceWriter, System.Windows.Forms, Version=4.0.0.0, Culture=neutral, PublicKeyToken=b77a5c561934e089</value>' +
    '  </resheader>';