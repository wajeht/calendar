const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const phonePattern = /^(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
const trailingPunctuationPattern = /^(.+?)([.,;:!?)\]}>]+)$/;

export function getSafeHttpUrl(value) {
    if (!value || typeof value !== "string") return "";

    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:" ? url.href : "";
    } catch {
        return "";
    }
}

export function linkifyText(text) {
    if (!text || typeof text !== "string") return [];

    const parts = [];
    for (const word of text.split(/(\s+)/)) {
        if (/^\s+$/.test(word)) {
            parts.push({ text: word });
            continue;
        }

        const punctuationMatch = word.match(trailingPunctuationPattern);
        const value = punctuationMatch?.[1] || word;
        const trailingPunctuation = punctuationMatch?.[2] || "";

        if (emailPattern.test(value)) {
            parts.push({ text: value, href: `mailto:${value}` });
        } else if (phonePattern.test(value)) {
            parts.push({ text: value, href: `tel:${value.replace(/[^\d+]/g, "")}` });
        } else {
            const href = getSafeHttpUrl(value);
            parts.push(href ? { text: value, href, external: true } : { text: word });
        }

        if (trailingPunctuation && parts.at(-1).href) {
            parts.push({ text: trailingPunctuation });
        }
    }

    return parts;
}
