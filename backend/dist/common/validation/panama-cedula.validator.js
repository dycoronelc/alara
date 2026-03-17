"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsPanamaCedula = IsPanamaCedula;
exports.isPanamaCedulaFormat = isPanamaCedulaFormat;
const class_validator_1 = require("class-validator");
const PANAMA_CEDULA_REGEX = /^(\d{1,2}-\d{1,4}-\d{1,5}|PE-\d{1,4}-\d{1,5}|E-\d{1,4}-\d{1,6}|N-\d{1,4}-\d{1,4}|\d{1,2}PI-\d{1,4}-\d{1,5}|\d{1,2}AV-\d{1,4}-\d{1,5})$/i;
function IsPanamaCedula(validationOptions) {
    return function (object, propertyName) {
        (0, class_validator_1.registerDecorator)({
            name: 'isPanamaCedula',
            target: object.constructor,
            propertyName,
            options: validationOptions ?? {
                message: 'El número de cédula no cumple un formato válido de Panamá. Ejemplos: 1-1234-12345, PE-1234-12345, E-8-157481, N-1234-1234, 1PI-1234-12345, 1AV-1234-12345',
            },
            validator: {
                validate(value, args) {
                    if (value == null || value === '')
                        return true;
                    const s = String(value).trim();
                    return PANAMA_CEDULA_REGEX.test(s);
                },
            },
        });
    };
}
function isPanamaCedulaFormat(value) {
    if (!value || typeof value !== 'string')
        return false;
    return PANAMA_CEDULA_REGEX.test(value.trim());
}
//# sourceMappingURL=panama-cedula.validator.js.map