import * as assert from 'assert';
import { ast } from './ast';

describe('XJS parser', () => {

    it("should parse template functions", async function () {
        assert.equal(await ast.template(`() => {}`), `
            #tplFunction()
        ` , '1');

        assert.equal(await ast.template(`(a, b) => {}`), `
            #tplFunction(a, b)
        ` , '2');

        assert.equal(await ast.template(`(a:string, b:boolean) => {}`), `
            #tplFunction(a:string, b:boolean)
        ` , '3');

        assert.equal(await ast.template(`($: MyParamClass) => {}`), `
            #tplFunction($:MyParamClass)
        ` , '4');

        assert.equal(await ast.template(`a => {}`), `
            #tplFunction(a)
        ` , '5');
    });

    it("should parse the template function indentation", async function () {
        assert.equal(await ast.initIndent(`() => {}`), "", '1');
        assert.equal(await ast.initIndent(`() => {  
            let x = 3;
        }`), "            ", '2');
        assert.equal(await ast.initIndent(`() => {
            <div/>
        }`,), "            ", '3');
        assert.equal(await ast.initIndent(`() => {
            <!/>
        }`,), "            ", '4');
        assert.equal(await ast.initIndent(`() => {
              # Hello #
        }`,), "              ", '5');
        assert.equal(await ast.initIndent(`() => {
                if (true) {
                    <div/>
                }
        }`), "                ", '6');
    });

    it("should parse simple text nodes", async function () {
        assert.equal(await ast.template(`() => {
            # Hello World #
        }`), `
            #tplFunction()
                #textNode " Hello World "
        ` , '1');

        assert.equal(await ast.template(`() => {
            # Hello 
              World #
        }`), `
            #tplFunction()
                #textNode " Hello               World "
        ` , '2');

        assert.equal(await ast.template(`(a) => {
            # Hello {a+2} #
        }`), `
            #tplFunction(a)
                #textNode
                    " Hello "
                    #expression {a+2}
                    " "
        ` , '3');

        assert.equal(await ast.template(`(a) => {
            #{a}{::a*2}#
        }`), `
            #tplFunction(a)
                #textNode
                    ""
                    #expression {a}
                    ""
                    #expression {::a*2}
        ` , '4');

        assert.equal(await ast.template(`(a) => {
            #{a} +++ #
        }`), `
            #tplFunction(a)
                #textNode
                    ""
                    #expression {a}
                    " +++ "
        ` , '5');
    });

    it("should parse self-closing element nodes", async function () {
        assert.equal(await ast.template(`() => {
            <div/>
            <span  />
        }`), `
            #tplFunction()
                #element <div/>
                #element <span/>
        ` , '1');
    });

    it("should parse elements in element nodes", async function () {
        assert.equal(await ast.template(`() => {
            <div>
                <section>
                    <div/>
                    # Some text #
                </>
                <span/>
            </div>
            <span  />
        }`), `
            #tplFunction()
                #element <div>
                    #element <section>
                        #element <div/>
                        #textNode " Some text "
                    #element <span/>
                #element <span/>
        ` , '1');
    });

    it("should parse params", async function () {
        assert.equal(await ast.template(`() => {
            <div a=123 b = "abc" c  =true d   = false/>
        }`), `
            #tplFunction()
                #element <div a=123 b="abc" c=true d=false/>
        ` , '1');

        assert.equal(await ast.template(`() => {
            <div a="abc" disabled d=true important/>
        }`), `
            #tplFunction()
                #element <div a="abc" disabled d=true important/>
        ` , '2');

        assert.equal(await ast.template(`() => {
            <div a={1+2+3} b={:: foo() }/>
        }`), `
            #tplFunction()
                #element <div a={1+2+3} b={:: foo() }/>
        ` , '3');

        assert.equal(await ast.template(`() => {
            <div aria-label="some label"/>
        }`), `
            #tplFunction()
                #element <div aria-label="some label"/>
        ` , '4');
    });

    it("should parse function params", async function () {
        assert.equal(await ast.template(`() => {
            <div f={()=>{abc();def();return 42}}/>
        }`), `
            #tplFunction()
                #element <div f={()=>{abc();def();return 42}}/>
        ` , '1');

        assert.equal(await ast.template(`() => {
            <div f={=>abc()}/>
        }`), `
            #tplFunction()
                #element <div f={()=>abc()}/>
        ` , '2');

        assert.equal(await ast.template(`() => {
            <div f={e=>abc(e)}/>
        }`), `
            #tplFunction()
                #element <div f={e=>abc(e)}/>
        ` , '3');

        assert.equal(await ast.template(`() => {
            <div f={(a,b)=>{abc(a,b); return 9;}}/>
        }`), `
            #tplFunction()
                #element <div f={(a,b)=>{abc(a,b); return 9;}}/>
        ` , '4');
    });

    it("should parse binding shortcuts", async function () {
        assert.equal(await ast.template(`() => {
            <div {title}/>
        }`), `
            #tplFunction()
                #element <div title={title}/>
        ` , '1');

        assert.equal(await ast.template(`() => {
            <div { title  }/>
        }`), `
            #tplFunction()
                #element <div title={title}/>
        ` , '2');

        assert.equal(await ast.template(`() => {
            <div {::title  }/>
        }`), `
            #tplFunction()
                #element <div title={::title}/>
        ` , '3');

        assert.equal(await ast.template(`() => {
            <div {[className]}/>
        }`), `
            #tplFunction()
                #element <div [className]={className}/>
        ` , '4');

        assert.equal(await ast.template(`() => {
            <div {[ className  ]}/>
        }`), `
            #tplFunction()
                #element <div [className]={className}/>
        ` , '5');

        assert.equal(await ast.template(`() => {
            <div {::[ className  ]}/>
        }`), `
            #tplFunction()
                #element <div [className]={::className}/>
        ` , '6');

        assert.equal(await ast.template(`() => {
            <*cpt {title}/>
        }`), `
            #tplFunction()
                #component <$cpt title={title}/>
        ` , '7');
        assert.equal(await ast.template(`() => {
            <*cpt>
                <.param {title}/>
            </>
        }`), `
            #tplFunction()
                #component <$cpt>
                    #paramNode <.param title={title}/>
        ` , '8');

        assert.equal(await ast.template(`() => {
            <div {title} {foo}/>
        }`), `
            #tplFunction()
                #element <div title={title} foo={foo}/>
        ` , '9');

        assert.equal(await ast.template(`() => {
            <div @foo(data="x" {title} {foo})/>
        }`), `
            #tplFunction()
                #element <div @foo(data="x" title={title} foo={foo})/>
        ` , '10');
    });

    it("should parse spread expressions", async function () {
        assert.equal(await ast.template(`() => {
            <div {... expr(123)   }/>
        }`), `
            #tplFunction()
                #element <div {... expr(123)   }/>
        ` , '1');

        assert.equal(await ast.template(`() => {
            <div {...[ expr(123)   ]}/>
        }`), `
            #tplFunction()
                #element <div {...[ expr(123)   ]}/>
        ` , '2');
    });

    it("should parse comments in params", async function () {
        assert.equal(await ast.template(`() => {
            <div a=123 /* comment 1 */ b = "abc" 
                c  =true // comment 2
                // comment 3
                d   = false/>
        }`), `
            #tplFunction()
                #element <div a=123 b="abc" c=true d=false/>
        ` , '1');
    });

    it("should parse params in text nodes", async function () {
        assert.equal(await ast.template(`() => {
            <div>
                # (#foo @i18n="abc") Hello World #
            </div>
        }`), `
            #tplFunction()
                #element <div>
                    #textNode(#foo @i18n="abc") " Hello World "
        ` , '1');
    });

    it("should parse properties", async function () {
        assert.equal(await ast.template(`() => {
            <div [prop]= 123 [b]={ abc(123 )}/>
        }`), `
            #tplFunction()
                #element <div [prop]=123 [b]={ abc(123 )}/>
        ` , '1');
    });

    it("should parse labels", async function () {
        assert.equal(await ast.template(`() => {
            <div #foo #bar/>
            <*cpt #baz ##blah/>
        }`), `
            #tplFunction()
                #element <div #foo #bar/>
                #component <$cpt #baz ##blah/>
        ` , '1');

        assert.equal(await ast.template(`() => {
            <div #foo=123 #bar="abc"/>
            <*cpt #baz={expr()} ##blah={expr2()}/>
        }`), `
            #tplFunction()
                #element <div #foo=123 #bar="abc"/>
                #component <$cpt #baz={expr()} ##blah={expr2()}/>
        ` , '1');
    });

    it("should parse decorator params", async function () {
        assert.equal(await ast.template(`() => {
            <div @foo @important/>
        }`), `
            #tplFunction()
                #element <div @foo @important/>
        ` , '1');

        assert.equal(await ast.template(`() => {
            <div @bar=123 @baz={someExpr(1, 2, 3)}/>
        }`), `
            #tplFunction()
                #element <div @bar=123 @baz={someExpr(1, 2, 3)}/>
        ` , '2');

        assert.equal(await ast.template(`() => {
            <div @foo(a=1 b={123 / 3} @disabled @bar=2) @bar=4/>
        }`), `
            #tplFunction()
                #element <div @foo(a=1 b={123 / 3} @disabled @bar=2) @bar=4/>
        ` , '3');
    });

    it("should parse components", async function () {
        assert.equal(await ast.template(`() => {
            <div>
                <*foo p1=123 @class(active={expr()})>
                    <div/>
                    # Some text #
                </*foo>
                <*bar blah/>
                <*b.message>
                    <*warning/>
                </>
            </div>
        }`), `
            #tplFunction()
                #element <div>
                    #component <$foo p1=123 @class(active={expr()})>
                        #element <div/>
                        #textNode " Some text "
                    #component <$bar blah/>
                    #component <$b.message>
                        #component <$warning/>
        ` , '1');
    });

    it("should parse decorator nodes", async function () {
        assert.equal(await ast.template(`() => {
            <div @highlight>
                <@b.tooltip @class(dark={e()}) position="top" sync = false>
                    # Rich content #
                </>
                # Div content #
            </div>
        }`), `
            #tplFunction()
                #element <div @highlight>
                    #decoratorNode <@b.tooltip position="top" sync=false @class(dark={e()})>
                        #textNode " Rich content "
                    #textNode " Div content "
        ` , '1');
    });

    it("should parse param nodes", async function () {
        assert.equal(await ast.template(`() => {
            <*b.section>
                <.header class="big">
                    <b> # Rich header content # </b>
                    <.sidePanel>
                        <button class="cool"/>
                    </>
                </>
                # Section content #
                <.footer> # some info # </>
            </>
        }`), `
            #tplFunction()
                #component <$b.section>
                    #paramNode <.header class="big">
                        #element <b>
                            #textNode " Rich header content "
                        #paramNode <.sidePanel>
                            #element <button class="cool"/>
                    #textNode " Section content "
                    #paramNode <.footer>
                        #textNode " some info "
        ` , '1');
    });

    it("should parse elements with name expressions", async function () {
        assert.equal(await ast.template(`() => {
            <{expr()} a="valueA"/>
        }`), `
            #tplFunction()
                #element <{expr()} a="valueA"/>
        ` , '1');

        assert.equal(await ast.template(`() => {
            <.{::expr()}>
            </>
        }`), `
            #tplFunction()
                #paramNode <.{::expr()}>
        ` , '2');
    });

    it("should parse js statements", async function () {
        assert.equal(await ast.template(`() => {
            let x = 123;
            // comment
            let y = "abc";
        }`), `
            #tplFunction()
                #jsStatements
                    let x = 123;
                    // comment
                    let y = "abc";
        ` , '1');

        assert.equal(await ast.template(`() => {
            let x = 123;
            <div>
                // comment
                <span/>
                let foo = "abc",
                    bar = 123;
                <div class={foo} />
                bar++;
            </div>
            x += 3;
        }`), `
            #tplFunction()
                #jsStatements
                    let x = 123;
                #element <div>
                    #jsStatements
                        // comment
                    #element <span/>
                    #jsStatements
                        let foo = "abc",
                        bar = 123;
                    #element <div class={foo}/>
                    #jsStatements
                        bar++;
                #jsStatements
                    x += 3;
        ` , '2');
    });

    it("should parse js blocks", async function () {
        assert.equal(await ast.template(`a => {
            if (a) {
                <div>
                    # hello #
                </div>
            }
        }`), `
            #tplFunction(a)
                #jsBlock
                    if (a) {
                        #element <div>
                            #textNode " hello "
                    }
        ` , '1');

        assert.equal(await ast.template(`(a, b) => {
            for (let i=0; a.length>i;) {
                let b = a[i];
                if (b) {
                    <div>
                        # hello #
                    </div>
                }
                i++;
            }
        }`), `
            #tplFunction(a, b)
                #jsBlock
                    for (let i=0; a.length>i;) {
                        #jsBlock
                            let b = a[i];
                            if (b) {
                                #element <div>
                                    #textNode " hello "
                            }
                        #jsStatements
                            i++;
                    }
        ` , '2');

        assert.equal(await ast.template(`(a, b) => {
            if (a) {
                <div/>
            } else if (b) {
                <span/>
            }
        }`), `
            #tplFunction(a, b)
                #jsBlock
                    if (a) {
                        #element <div/>
                    }
                #jsBlock
                    else if (b) {
                        #element <span/>
                    }
        ` , '3');

        assert.equal(await ast.template(`(a) => {
            do {
                <div/>
            } while (a);
        }`), `
            #tplFunction(a)
                #jsBlock
                    do {
                        #element <div/>
                    }
                #jsStatements
                    while (a);
        ` , '4');
    });

    it("should not create unnecessary js blocks", async function () {
        assert.equal(await ast.template(`(a,b) => {
            // indent initializer
            if (a) {
                doSomething();
            }
            if (b) {
                somethingElse();
            }
            <div/>
        }`), `
            #tplFunction(a, b)
                #jsStatements
                    // indent initializer
                    if (a) {
                        doSomething();
                    }
                    if (b) {
                        somethingElse();
                    }
                #element <div/>
        ` , '1');

        assert.equal(await ast.template(`(a,b) => {
            if (a) {
                doSomething();
            }
            if (b) {
                somethingElse();
                <div/>
            }
        }`), `
            #tplFunction(a, b)
                #jsBlock
                    if (a) {
                    doSomething();
                    }
                    if (b) {
                        #jsStatements
                            somethingElse();
                        #element <div/>
                    }
        ` , '2');

        assert.equal(await ast.template(`(a,b) => {
            if (a) {
                doSomething();
                if (b) {
                    somethingElse();
                    <div/>
                }
            }
        }`), `
            #tplFunction(a, b)
                #jsBlock
                    if (a) {
                        #jsBlock
                            doSomething();
                            if (b) {
                                #jsStatements
                                    somethingElse();
                                #element <div/>
                            }
                    }
        ` , '3');

        assert.equal(await ast.template(`(a,b) => {
            // indent initializer
            if (a) {
                doSomething();
                if (b) {
                    somethingElse();
                }
            }
        }`), `
            #tplFunction(a, b)
                #jsStatements
                    // indent initializer
                    if (a) {
                        doSomething();
                        if (b) {
                            somethingElse();
                        }
                    }
        ` , '4');
    });

    it("should properly handle object literals", async function () {
        assert.equal(await ast.template(`(a,b) => {
            let x =  { a:a, b:b };
            <div/>
        }`), `
            #tplFunction(a, b)
                #jsStatements
                    let x =  { a:a, b:b };
                #element <div/>
        ` , '1');

        assert.equal(await ast.template(`(a,b) => {
            let x;
            if (a) {
                x = {
                    a:a, 
                    b:b
                };
                a+=b;
            }
        }`), `
            #tplFunction(a, b)
                #jsStatements
                    let x;
                    if (a) {
                        x = {
                            a:a, 
                            b:b
                        };
                        a+=b;
                    }
        ` , '2');

        assert.equal(await ast.template(`(a,b) => {
            let x;
            if (a) {
                // indent initializer
                x = {
                    a: { a: a}, 
                    b:b
                };
                <div/>
            }
        }`), `
            #tplFunction(a, b)
                #jsBlock
                    let x;
                    if (a) {
                        #jsStatements
                            // indent initializer
                            x = {
                                a: { a: a}, 
                                b:b
                            };
                        #element <div/>
                    }
        ` , '3');
    });

    it("should support optional template arguments", async function () {
        assert.equal(await ast.template(`(header?:IvContent) => {
            if (header) {
                <div class="header"/>
            }
        }`), `
            #tplFunction(header?:IvContent)
                #jsBlock
                    if (header) {
                        #element <div class="header"/>
                    }
        ` , '1');

        assert.equal(await ast.template(`(foo:string, title?) => {
            if (title) {
                <div class="title"/>
            }
        }`), `
            #tplFunction(foo:string, title?)
                #jsBlock
                    if (title) {
                        #element <div class="title"/>
                    }
        ` , '2');
    });

    it("should support type arrays in template params", async function () {
        assert.equal(await ast.template(`(foo: FooClass, bar: BarClass[], baz: x.BazClass[][]) => {
            # Hello #
        }`), `
            #tplFunction(foo:FooClass, bar:BarClass[], baz:x.BazClass[][])
                #textNode " Hello "
        ` , '1');
    });

    it("should support default values for template parameters", async function () {
        assert.equal(await ast.template(`(foo="") => {
            # Hello #
        }`), `
            #tplFunction(foo="")
                #textNode " Hello "
        ` , '1');

        assert.equal(await ast.template(`(idx1 = 12.3, idx2:number =123, foo:string="bar", foo2= 'bar2', baz:boolean = false, blah:any=true) => {
            # Hello #
        }`), `
            #tplFunction(idx1=12.3, idx2:number=123, foo:string="bar", foo2='bar2', baz:boolean=false, blah:any=true)
                #textNode " Hello "
        ` , '2');

        // assert.equal(await ast.template(`(foo = func("abc", 123), bar = new SuperBar(123) ) => {
        //     # Hello #
        // }`), `
        //     #tplFunction()
        //         #textNode " Hello "
        // ` , '3');
    });

    it("should support comments in template arguments", async function () {
        assert.equal(await ast.template(`($api:HelloAPI, name /* comment */) => {
            # Hello #
        }`), `
            #tplFunction($api:HelloAPI, name)
                #textNode " Hello "
        ` , '1');
    });

    it("should support comments in params", async function () {
        assert.equal(await ast.template(`() => {
            <div 
                // comment
                    foo="bar">
                # Hello #
            </div>
        }`), `
            #tplFunction()
                #element <div foo="bar">
                    #textNode " Hello "
        ` , '1');
    });

    it("should support 2-way binding expressions", async function () {
        assert.equal(await ast.template(`() => {
            <*cpt foo={=a.b.c}/>
        }`), `
            #tplFunction()
                #component <$cpt foo={=a.b.c}/>
        ` , '1');
    });

    it("should support single quote for string values", async function () {
        assert.equal(await ast.template(`() => {
            <div class='abc' [title]='def'>
                <*b.section title='hello'>
                    <.header class='big'>
                        <b> # Rich header content # </b>
                        <.sidePanel>
                            <button class='cool'/>
                        </>
                    </>
                    # Section content #
                </>
            </div>
        }`), `
            #tplFunction()
                #element <div class="abc" [title]="def">
                    #component <$b.section title="hello">
                        #paramNode <.header class="big">
                            #element <b>
                                #textNode " Rich header content "
                            #paramNode <.sidePanel>
                                #element <button class="cool"/>
                        #textNode " Section content "
        ` , '1');
    });

    // TODO: support function call and new initialization in template args
});
