/** Parse target types as data, preserving identity and discarding SQL comments. */
import { scanSync } from "libpg-query";
import { statements, ast_hash, walk } from "./sql.mjs";
import { canonical } from "./model.mjs";

export function normalize_target_type(to) {
  if (to !== null) {
    try {
      if (typeof to !== "string") throw new Error();
      const parsed = statements("SELECT NULL::" + to);
      const body = parsed[0]?.stmt.SelectStmt;
      const target = body?.targetList?.[0]?.ResTarget;
      const cast = target?.val.TypeCast;
      if (
        parsed.length !== 1 ||
        body.targetList.length !== 1 ||
        Object.keys(target).some((key) => !["val", "location"].includes(key)) ||
        Object.keys(body).some(
          (key) => !["targetList", "limitOption", "op"].includes(key),
        ) ||
        canonical(cast?.arg) !==
          canonical({ A_Const: { isnull: true, location: 7 } })
      )
        throw new Error();
      const type = cast.typeName;
      const credentials = /postgres(?:ql)?:\/\/|password\s*=/i;
      if (
        [...walk(type, "String")].some((identifier) =>
          credentials.test(identifier.sval),
        )
      )
        throw new Error();
      if ([...walk(type.typmods, "A_Const")].some((constant) => constant.sval))
        throw new Error();
      // Keep PostgreSQL's quoted identifier tokens; rebuilding names can turn
      // a custom "integer" or "interval" type into a built-in type alias.
      const tokens = scanSync(to).tokens.filter(
        (token) => !["C_COMMENT", "SQL_COMMENT"].includes(token.tokenName),
      );
      if (tokens.some((token) => token.text === ";")) throw new Error();
      to = "";
      let previous = "";
      for (const token of tokens) {
        const text = token.keywordKind ? token.text.toLowerCase() : token.text;
        if (
          to &&
          ![".", ",", "(", ")", "[", "]"].includes(text) &&
          ![".", "(", "[", ",", "-", "+"].includes(previous)
        )
          to += " ";
        to += text;
        previous = text;
      }
      if (credentials.test(to)) throw new Error();
      const normalized = statements("SELECT NULL::" + to)[0].stmt.SelectStmt
        .targetList[0].ResTarget.val.TypeCast.typeName;
      if (ast_hash(type) !== ast_hash(normalized)) throw new Error();
    } catch {
      throw new Error("Malformed target type; supply one PostgreSQL type");
    }
  }
  return to;
}
