import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

/**
 * True only when `day/month/year` name a date that exists on a real calendar.
 *
 * `new Date(year, month - 1, day)` does not fail on an impossible day: it rolls
 * over silently, so 31 February becomes 3 March and the event lands in another
 * month than the one the client asked for.
 */
export function isRealCalendarDate(day: unknown, month: unknown, year: unknown): boolean {
  const parts = [day, month, year];
  if (!parts.every((part) => typeof part === 'number' && Number.isInteger(part))) {
    return false;
  }

  const dayNumber = day as number;
  const monthNumber = month as number;
  const yearNumber = year as number;
  const date = new Date(Date.UTC(yearNumber, monthNumber - 1, dayNumber));

  return (
    date.getUTCFullYear() === yearNumber &&
    date.getUTCMonth() === monthNumber - 1 &&
    date.getUTCDate() === dayNumber
  );
}

/**
 * Per-field range decorators cannot see the combination, so this constraint lives
 * on the day and reads its siblings from the object being validated. It returns
 * false rather than throwing when a sibling is missing, which keeps a malformed
 * body a 400 instead of a 500.
 */
export function IsRealCalendarDate(validationOptions?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    registerDecorator({
      name: 'isRealCalendarDate',
      target: target.constructor,
      propertyName: String(propertyKey),
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const { month, year } = args.object as { month?: unknown; year?: unknown };
          return isRealCalendarDate(value, month, year);
        },
        defaultMessage: () => 'El día no existe en el mes indicado',
      },
    });
  };
}
