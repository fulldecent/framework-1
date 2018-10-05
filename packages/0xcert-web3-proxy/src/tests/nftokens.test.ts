import { Spec } from '@specron/spec';

/**
 * Spec context interfaces.
 */

interface Data {
  nftProxy?: any;
  owner?: string;
  bob?: string;
  jane?: string;
  sara?: string;
}

const spec = new Spec<Data>();

spec.beforeEach(async (ctx) => {
  const accounts = await ctx.web3.eth.getAccounts();
  ctx.set('owner', accounts[0]);
  ctx.set('bob', accounts[1]);
  ctx.set('jane', accounts[2]);
  ctx.set('sara', accounts[3]);
});

spec.beforeEach(async (ctx) => {
  const nftProxy = await ctx.deploy({
    src: './build/nftoken-transfer-proxy.json',
    contract: 'NFTokenTransferProxy',
  });
  ctx.set('nftProxy', nftProxy);
});

spec.test('adds authorized address', async (ctx) => {
  const nftProxy = ctx.get('nftProxy');
  const owner = ctx.get('owner');
  const bob = ctx.get('bob');
  const logs = await nftProxy.instance.methods.addAuthorizedAddress(bob).send({ from: owner });
  ctx.not(logs.events.LogAuthorizedAddressAdded, undefined);

  const authorizedAddresses = await nftProxy.instance.methods.getAuthorizedAddresses().call();
  ctx.is(authorizedAddresses[0], bob);
});

spec.test('fails when trying to add an already authorized address', async (ctx) => {
  const nftProxy = ctx.get('nftProxy');
  const owner = ctx.get('owner');
  const bob = ctx.get('bob');
  await nftProxy.instance.methods.addAuthorizedAddress(bob).send({ from: owner });
  await ctx.reverts(() => nftProxy.instance.methods.addAuthorizedAddress(bob).send({ from: owner }), '013001');
});

spec.test('removes authorized address', async (ctx) => {
  const nftProxy = ctx.get('nftProxy');
  const owner = ctx.get('owner');
  const bob = ctx.get('bob');
  await nftProxy.instance.methods.addAuthorizedAddress(bob).send({ from: owner });
  const logs = await nftProxy.instance.methods.removeAuthorizedAddress(bob).send({ from: owner });
  ctx.not(logs.events.LogAuthorizedAddressRemoved, undefined);

  const authorizedAddresses = await nftProxy.instance.methods.getAuthorizedAddresses().call();
  ctx.is(authorizedAddresses.length, 0);
});

spec.test('fails when trying to remove an already unauthorized address', async (ctx) => {
  const nftProxy = ctx.get('nftProxy');
  const owner = ctx.get('owner');
  const bob = ctx.get('bob');
  await ctx.reverts(() => nftProxy.instance.methods.removeAuthorizedAddress(bob).send({ from: owner }), '013002');
});

spec.test('transfers an NFT', async (ctx) => {
  const nftProxy = ctx.get('nftProxy');
  const owner = ctx.get('owner');
  const bob = ctx.get('bob');
  const jane = ctx.get('jane');
  const sara = ctx.get('sara');

  await nftProxy.instance.methods.addAuthorizedAddress(bob).send({ from: owner });

  const cat = await ctx.deploy({ 
    src: '@0xcert/web3-erc721/build/nf-token-metadata-enumerable-mock.json',
    contract: 'NFTokenMetadataEnumerableMock',
    args: ['cat', 'CAT'],
  });

  await cat.instance.methods
    .mint(jane, 1, 'http://0xcert.org')
    .send({
       from: owner ,
      gas: 4000000,
    });

  await cat.instance.methods.approve(nftProxy.receipt._address, 1).send({ from: jane });
  await nftProxy.instance.methods.execute(cat.receipt._address, jane, sara, 1).send({ from: bob });

  const newOwner = await cat.instance.methods.ownerOf(1).call();
  ctx.is(newOwner, sara);
});

spec.test('fails if transfer is triggered by an unauthorized address', async (ctx) => {
  const nftProxy = ctx.get('nftProxy');
  const owner = ctx.get('owner');
  const bob = ctx.get('bob');
  const jane = ctx.get('jane');
  const sara = ctx.get('sara');

  const cat = await ctx.deploy({ 
    src: '@0xcert/web3-erc721/build/nf-token-metadata-enumerable-mock.json',
    contract: 'NFTokenMetadataEnumerableMock',
    args: ['cat', 'CAT'],
  });

  await cat.instance.methods
    .mint(jane, 1, 'http://0xcert.org')
    .send({
       from: owner ,
      gas: 4000000,
    });

  await cat.instance.methods.approve(nftProxy.receipt._address, 1).send({from: jane});
  await ctx.reverts(() => nftProxy.instance.methods.execute(cat.receipt._address, jane, sara, 1).send({ from: bob }), '013002');
});

export default spec;