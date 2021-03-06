import { XjsTplFunction, XjsText, XjsExpression, XjsFragment, XjsJsBlock, XjsDecorator, XjsJsStatements } from '../xjs/types';
import { parse } from '../xjs/parser';
import { XjsNode } from '../xjs/types';

export let ast = {
    rootPrefix: "        ",
    indent: "    ",

    // this api allows to trigger the vs-code text mate completion
    async template(tpl: string, log = false) {
        let root = await parse(tpl);

        if (!root) {
            return "ERROR";
        }

        let lines: string[] = [];
        lines.push("");
        serialize(root, lines, ast.rootPrefix + ast.indent);
        lines.push(ast.rootPrefix);
        let r = lines.join("\n");
        if (log) console.log(r);
        return r;
    },

    async initIndent(tpl: string, log = false) {
        let root = await parse(tpl);
        if (!root) {
            return "ERROR";
        }
        if (log) console.log(`'${root.indent}'`);
        return root.indent;
    }
}

function serialize(n: XjsNode, lines: string[], prefix: string) {
    switch (n.kind) {
        case "#tplFunction":
            return tplFunction(n as XjsTplFunction, lines, prefix);
        case "#textNode":
            return textNode(n as XjsText, lines, prefix);
        case "#expression":
            return expression(n as XjsExpression, lines, prefix);
        case "#element":
        case "#fragment":
        case "#component":
        case "#decoratorNode":
        case "#paramNode":
            return fragment(n as XjsFragment, lines, prefix);
        case "#jsStatements":
            return jsStatements(n as XjsJsStatements, lines, prefix);
        case "#jsBlock":
            return jsBlock(n as XjsJsBlock, lines, prefix);
        default:
            return lines.push("Unsupported XjsNode: " + n.kind);
    }
}

function tplFunction(n: XjsTplFunction, lines: string[], prefix: string) {
    let args: string[] = [];
    if (n.arguments) {
        for (let arg of n.arguments) {
            let optional = arg.optional ? "?" : "", def = "";
            if (arg.typeRef) {
                def = arg.name + optional + ":" + arg.typeRef;
            } else {
                def = arg.name + optional;
            }
            if (arg.defaultValue) {
                def += "=" + arg.defaultValue;
            }
            args.push(def);
        }
    }
    lines.push(`${prefix}#tplFunction(${args.join(', ')})`);
    if (n.content) {
        for (let c of n.content) {
            serialize(c, lines, prefix + ast.indent);
        }
    }
}

function jsStatements(n: XjsJsStatements, lines: string[], prefix: string) {
    lines.push(`${prefix}#jsStatements`);
    jsCode(n.code, lines, prefix + ast.indent);
}

function jsBlock(n: XjsJsBlock, lines: string[], prefix: string) {
    lines.push(`${prefix}#jsBlock`);
    jsCode(n.startCode, lines, prefix + ast.indent);
    if (n.content) {
        for (let c of n.content) {
            serialize(c, lines, prefix + ast.indent + ast.indent);
        }
    }
    jsCode(n.endCode, lines, prefix + ast.indent);
}

function jsCode(code: string, lines: string[], prefix: string) {
    let codeLines = code.split("\n"), s = "", idx = 0, indent = 0, ws = "";
    for (let ln of codeLines) {
        // first line will always have 0 indent as spaces are eaten by the parser

        if (idx > 0) {
            ws = ln.match(/^\s*/g)![0];
            if (idx === 1) {
                indent = ws.length;
            } else if (ws.length < indent) {
                indent = ws.length;
            }
        }
        lines.push(prefix + ln.slice(indent));
        idx++;
    }
}

function textNode(n: XjsText, lines: string[], prefix: string) {
    let p = params(n, "(", ")");
    if (n.expressions && n.expressions.length) {
        let idx = 0;
        lines.push(`${prefix}#textNode${p}`);
        do {
            lines.push(`${prefix + ast.indent}"${n.textFragments[idx]}"`);
            if (idx < n.expressions.length) {
                serialize(n.expressions[idx], lines, prefix + ast.indent);
            }
            idx++;
        } while (idx < n.textFragments.length);
    } else {
        lines.push(`${prefix}#textNode${p} "${n.textFragments[0]}"`);
    }
}

function expression(n: XjsExpression, lines: string[], prefix: string) {
    lines.push(`${prefix}#expression {${n.oneTime ? "::" : ""}${n.code}}`);
}

function params(n: XjsFragment | XjsDecorator | XjsText, prefix = "", suffix = "") {
    let res: string[] = []
    if (n.labels) {
        let buffer: string[] = [], col: string;
        for (let lbl of n.labels) {
            if (!lbl.isOrphan) {
                buffer.push(`#${lbl.fwdLabel ? "#" : ""}${lbl.name}=${getParamValue(lbl.value)}`);
            } else {
                buffer.push(`#${lbl.fwdLabel ? "#" : ""}${lbl.name}`);
            }
        }
        res.push(buffer.join(" "));
    }
    if (n.params) {
        let buffer: string[] = [];
        for (let p of n.params) {
            if (p.isSpread) {
                buffer.push(`{...${(p.value as XjsExpression).code}}`);
            } else if (p.isOrphan || !p.value) {
                buffer.push(p.name);
            } else {
                buffer.push(`${p.name}=${getParamValue(p.value)}`);
            }
        }
        res.push(buffer.join(" "));
    }
    if ((n as XjsFragment).properties) {
        let buffer: string[] = [];
        for (let prop of (n as XjsFragment).properties!) {
            if (prop.isSpread) {
                buffer.push(`{...[${(prop.value as XjsExpression).code}]}`);
            } else {
                buffer.push(`[${prop.name}]=${getParamValue(prop.value)}`);
            }
        }
        res.push(buffer.join(" "));
    }
    if (n.decorators) {
        let buffer: string[] = [], nm = "";
        for (let d of n.decorators) {
            if (d.isOrphan) {
                buffer.push(`@${d.ref.code}`);
            } else if (d.hasDefaultPropValue) {
                buffer.push(`@${d.ref.code}=${getParamValue(d.defaultPropValue)}`);
            } else {
                buffer.push(`@${d.ref.code}(${params(d)})`);
            }
        }
        res.push(buffer.join(" "));
    }
    return res.length ? prefix + res.join(" ") + suffix : "";
}

function fragment(n: XjsFragment, lines: string[], prefix: string) {
    let nm = "!";
    if (n.kind === "#component") {
        nm = "$" + n["ref"].code;
    } else if (n.kind === "#element" || n.kind === "#paramNode") {
        let exp = n["nameExpression"] as XjsExpression;
        if (exp) {
            nm = `{${exp.oneTime ? "::" : ""}${exp.code}}`;
        } else {
            nm = n["name"];
        }
    } else if (n.kind === "#decoratorNode") {
        nm = "@" + n["ref"].code;
    }
    if (n.kind === "#paramNode") {
        nm = "." + nm;
    }

    lines.push(`${prefix}${n.kind} <${nm}${params(n, " ")}${n.content ? "" : "/"}>`);

    if (n.content) {
        for (let c of n.content) {
            serialize(c, lines, prefix + ast.indent);
        }
    }
}

function getParamValue(value) {
    switch (value.kind) {
        case "#boolean":
        case "#number":
            return "" + value.value;
        case "#string":
            return '"' + value.value + '"';
        case "#expression":
            let exp = value;
            return '{' + (exp.oneTime ? "::" : "") + (exp.isBinding ? "=" : "") + exp.code + '}';
    }
    return "INVALID";
}
