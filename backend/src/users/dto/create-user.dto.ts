import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MaxLength(120)
  fullName!: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MinLength(8)
  password!: string;
}
