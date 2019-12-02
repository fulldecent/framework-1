import { Spec } from '@hayspec/spec';
import * as Ajv from 'ajv';
import { SchemaErc721, schemaErc721 } from '../assets/erc721';

const spec = new Spec<{
  validate: any;
}>();

spec.before((stage) => {
  stage.set('validate', new Ajv({ allErrors: true }).compile(schemaErc721));
});

spec.test('passes for valid data', (ctx) => {
  const data: SchemaErc721 = {
    'description': 'A weapon for the Troopers game which can severely injure the enemy.',
    'image': 'https://troopersgame.com/dog.jpg',
    'name': 'Troopers game',
  };
  ctx.true(ctx.get('validate')(data));
});

spec.test('fails for valid data', (ctx) => {
  const data = {
    'description': 'A weapon for the Troopers game which can severely injure the enemy.',
    'image': 'https://troopersgame.com/dog.jpg',
    'name': 12,
  };
  ctx.false(ctx.get('validate')(data));
});

export default spec;