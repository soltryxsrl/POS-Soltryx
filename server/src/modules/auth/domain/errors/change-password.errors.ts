export class CurrentPasswordWrongError extends Error {
  constructor() {
    super('La contraseña actual es incorrecta');
    this.name = 'CurrentPasswordWrongError';
  }
}

export class NewPasswordSameAsCurrentError extends Error {
  constructor() {
    super('La contraseña nueva debe ser distinta de la actual');
    this.name = 'NewPasswordSameAsCurrentError';
  }
}
