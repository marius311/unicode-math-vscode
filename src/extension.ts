import { TextDocument, Position, CancellationToken, CompletionContext, 
	Range, CompletionItem, ExtensionContext, TextEditor, 
	TextEditorEdit, commands, languages, window } from "vscode";
import * as Symbols from './symbols';

export function activate(context: ExtensionContext) {	
	const ctl = new UnicodeMaths(Symbols.default);
	context.subscriptions.push(commands.registerCommand('unicode-math-vscode.commit_tab', () => ctl.commit('tab')));
	context.subscriptions.push(commands.registerCommand('unicode-math-vscode.commit_space', () => ctl.commit('space')));
	context.subscriptions.push(languages.registerCompletionItemProvider({ scheme: 'all', language: '*' }, ctl, '.', ','));
}

export function deactivate() {}

class UnicodeMaths {
	private DEBUG: boolean = true;
	private keys: string[];
	constructor(private codes: {[key:string]: string}) { this.keys = Object.keys(codes); }

	public async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext) {				
		const [target, word] = this.evalPosition(document, position);
		if (!target || !word) { return; }
		let matches = this.keys.filter((k: string) => k.startsWith(word));		
		this.debug(`word: ${word} has ${matches.length} matches`);
		return matches.map((key: string) => {
			const item = new CompletionItem(key);
			item.detail = this.codes[key];
			item.insertText = this.codes[key];			
			item.range = target;			
			return item;
		});
	}	

	public commit(key: string) {
		if (!key || !window.activeTextEditor || !window.activeTextEditor.selection) { return; }				
		this.debug('commit - key: ' + key);
		// only single selection supported, I dont see how multiple selection support is worth the testing
		this.commitAtPosition(window.activeTextEditor.selection.start, key);
	}	

	private commitAtPosition(position: Position, key: string) {		
		const editor: TextEditor = <TextEditor> window.activeTextEditor;
		const dokey = () => {
			this.debug('commands.executeCommand: ' + key);
			if (key === 'space') {
				commands.executeCommand('type', { source: 'keyboard', text: ' ' });			
			} else {
				commands.executeCommand(key);				
			}
		};
		const [target, word] = this.evalPosition(editor.document, position);
		if (!target || !word) { return dokey(); }
		const changed = this.doWord(word);
		this.debug('word:', word, 'changing to:', changed);
		if (changed) { editor.edit(((editor: TextEditorEdit) => editor.replace(target, changed))); }
		// always propegate the space key, or propegate tab only if not used to insert a character
		if (!changed || key === 'space') { return dokey(); }
	}

	private evalPosition(document: TextDocument, position: Position): any[] {		
		if (position.character === 0) { return [null, null]; }
		try {
			const [range, word] = this.getWordRangeAtPosition(document, position);		
			this.debug('range:', !!range, 'word:', word);
			return !word || !word.startsWith('\\') ? [null, null] : [range, word];
		} catch (e) {
			return [null, null];	
		}
	}

	// this implementation has a loser meaning of word (anything starting with \)
	private getWordRangeAtPosition(document: TextDocument, position: Position): any[] {				
		const linestart = new Position(position.line, 0);
		const lnrange = new Range(linestart, position);
		const line = document.getText(lnrange);		
		const slash = line.lastIndexOf('\\');
		const word = line.substr(slash).trim();
		return [new Range(new Position(position.line, slash), position), word];
	}

	private doWord(word: string): string | null {
		const startch = word.charAt(1);
		if (this.isSubSupWord(word)) { return this.toSuperSub(word, startch === '_'); }		
		return this.codes[word] || null; 
	}

	private isSubSupWord(word: string): boolean {
		const startch = word.charAt(1);
		return startch === '_' || startch === '^';
	}

	private toSuperSub(word: string, tosub: boolean): string | null {
		const mapper = tosub ? subs : sups;
		const target = word.substr(2);
		const newstr = target.split('').map((c: string) => mapper[c] || c).join('');
		return newstr === target ? null : newstr;
	}

	private debug(msg: any, ...optionals: any[]) {
		if (!this.DEBUG) { return; }
		console.log(msg, ...optionals);
	}
}

// see: https://en.wikipedia.org/wiki/Unicode_subscripts_and_superscripts
const sups: {[key: string]: string} = {	"L": "ᴸ", "I": "ᴵ", "y": "ʸ", "9": "⁹", "0": "⁰", "δ": "ᵟ", "w": "ʷ", "4": "⁴", "l": "ˡ",
	"Z": "ᶻ", "P": "ᴾ", "b": "ᵇ", "7": "⁷", ")": "⁾", "h": "ʰ", "6": "⁶", "W": "ᵂ", "=": "⁼", "χ": "ᵡ", "m": "ᵐ", "-": "⁻",
	"r": "ʳ", "p": "ᵖ", "c": "ᶜ", "v": "ᵛ", "d": "ᵈ", "ϕ": "ᵠ", "θ": "ᶿ", "1": "¹", "T": "ᵀ", "o": "ᴼ", "K": "ᴷ", "e": "ᵉ",
	"G": "ᴳ", "t": "ᵗ", "8": "⁸", "β": "ᵝ", "V": "ⱽ", "M": "ᴹ", "s": "ˢ", "i": "ⁱ", "k": "ᵏ", "α": "ᵅ", "A": "ᴬ", "5": "⁵",
	"2": "²", "u": "ᶸ", "H": "ᴴ", "g": "ᵍ", "(": "⁽", "j": "ʲ", "f": "ᶠ", "D": "ᴰ", "γ": "ᵞ", "U": "ᵁ", "E": "ᴱ", "a": "ᵃ",
	"N": "ᴺ", "n": "ⁿ", "B": "ᴮ", "x": "ˣ", "3": "³", "R": "ᴿ", "+": "⁺", "J": "ᴶ"    
};

const subs: {[key: string]: string} = { "1": "₁", ")": "₎", "m": "ₘ", "4": "₄", "j": "ⱼ", "7": "₇", "β": "ᵦ", "8": "₈",
	"2": "₂", "3": "₃", "s": "ₛ", "u": "ᵤ", "χ": "ᵪ", "5": "₅", "t": "ₜ", "h": "ₕ", "-": "₋", "ρ": "ᵨ", "+": "₊",
	"o": "ₒ", "v": "ᵥ", "r": "ᵣ", "6": "₆", "(": "₍", "k": "ₖ", "x": "ₓ", "9": "₉", "=": "₌", "e": "ₑ", "l": "ₗ",
	"i": "ᵢ", "ϕ": "ᵩ", "a": "ₐ", "p": "ₚ", "n": "ₙ", "θ": "₀"
};