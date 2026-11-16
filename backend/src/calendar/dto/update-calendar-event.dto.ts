import {
  IsHexColor,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isRealCalendarDate } from './is-real-calendar-date';

/**
 * Every field is optional, but `null` is not a value: `@IsOptional()` would let
 * `{"title": null}` through to the database and turn a client mistake into a 500.
 * Validating whenever the key is present, and only skipping when it is absent,
 * keeps `{}` a no-op and `{"title": null}` a 400.
 */
const whenPresent = (_object: unknown, value: unknown): boolean => value !== undefined;

/**
 * The date is one column, so a half date would mean guessing the other half. This
 * constraint runs on `day` even when the client omits it, because `{ month, year }`
 * alone must also be rejected. It accepts "no date in this request" (only the title
 * or the colour changed) and "a complete, real date".
 */
@ValidatorConstraint({ name: 'isCompleteCalendarDate', async: false })
class IsCompleteCalendarDate implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const supplied = dateParts(args.object).filter((part) => part !== undefined);
    if (supplied.length === 0) return true;
    if (supplied.length !== 3) return false;

    const { day, month, year } = args.object as {
      day?: unknown;
      month?: unknown;
      year?: unknown;
    };
    return isRealCalendarDate(day, month, year);
  }

  defaultMessage(args: ValidationArguments): string {
    const { day, month, year } = args.object as {
      day?: unknown;
      month?: unknown;
      year?: unknown;
    };
    const parts = [day, month, year];

    if (parts.filter((part) => part !== undefined).length !== 3) {
      return 'day, month y year deben enviarse juntos';
    }

    if (!parts.every((part) => typeof part === 'number' && Number.isInteger(part))) {
      return 'day, month y year deben ser números enteros';
    }

    return 'El día no existe en el mes indicado';
  }
}

function dateParts(object: unknown): unknown[] {
  const { day, month, year } = object as { day?: unknown; month?: unknown; year?: unknown };
  return [day, month, year];
}

/**
 * Only the fields the client sends are written, and only the ones it is allowed to
 * own: `eventDate` and the linked task's description follow the title and the date
 * through the service, never from the body.
 */
export class UpdateCalendarEventDto {
  @ValidateIf(whenPresent)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title?: string;

  @ValidateIf(whenPresent)
  @IsHexColor()
  colorHex?: string;

  // No @ValidateIf here: this constraint is what notices a missing month or year.
  @Validate(IsCompleteCalendarDate)
  day?: number;

  @ValidateIf(whenPresent)
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @ValidateIf(whenPresent)
  @IsInt()
  @Min(2000)
  @Max(9999)
  year?: number;
}
