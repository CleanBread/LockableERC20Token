const LockableERC20WithRoles = artifacts.require('LockableERC20WithRoles');
const { expect } = require('chai');
const { time, BN, expectRevert } = require('@openzeppelin/test-helpers');

contract('LockableERC20WithRoles', ([alice, bob, cale]) => {
  const ONE = new BN('10000000000');
  const TWO = new BN('20000000000');
  const DAY = new BN(86400);

  let contractInstance;
  beforeEach(async () => {
    contractInstance = await LockableERC20WithRoles.new({
      from: alice,
    });
  });

  context('test lock', () => {
    it('should be able to lock only for locker role', async () => {
      await contractInstance.setLockerRole(bob, true, { from: alice });
      await contractInstance.setMinterRole(alice, true, { from: alice });
      await contractInstance.mint(alice, ONE, { from: alice });
      await contractInstance.lock(alice, ONE, DAY, {
        from: bob,
      });

      const lockTokens = await contractInstance.getLockValue(alice);

      expect(lockTokens).bignumber.equal(ONE);
    });

    it('should not be able to lock for not a locker role', async () => {
      await expectRevert(
        contractInstance.lock(alice, ONE, DAY, { from: alice }),
        'Only for locker',
      );
    });

    it('should not be to able burn more than locked tokens', async () => {
      await contractInstance.setLockerRole(bob, true, { from: alice });
      await contractInstance.setMinterRole(alice, true, { from: alice });
      await contractInstance.mint(alice, ONE, { from: alice });
      await contractInstance.lock(alice, ONE, DAY, {
        from: bob,
      });

      await expectRevert(
        contractInstance.burn(ONE, { from: alice }),
        'Amount greater then available balance',
      );
    });

    it('should be able to burn less than locked tokens', async () => {
      await contractInstance.setLockerRole(bob, true, { from: alice });
      await contractInstance.setMinterRole(alice, true, { from: alice });
      await contractInstance.mint(alice, TWO, { from: alice });
      await contractInstance.lock(alice, ONE, DAY, {
        from: bob,
      });
      await contractInstance.burn(ONE, { from: alice });
      const aliceBalance = await contractInstance.balanceOf(alice);

      expect(aliceBalance).bignumber.equal(TWO.sub(ONE));
    });

    it('should be able to burn all balance after unlock time', async () => {
      await contractInstance.setLockerRole(bob, true, { from: alice });
      await contractInstance.setMinterRole(alice, true, { from: alice });
      await contractInstance.mint(alice, TWO, { from: alice });
      await contractInstance.lock(alice, ONE, DAY, {
        from: bob,
      });
      await time.increase(DAY);
      await contractInstance.burn(TWO, { from: alice });
      const aliceBalance = await contractInstance.balanceOf(alice);

      expect(aliceBalance).bignumber.equal(new BN(0));
    });
  });

  context('test superUser', () => {
    it('should be able to set superUser role for user from another superUser', async () => {
      await contractInstance.setSuperUserRole(bob, true, { from: alice });
      const isBobSuperUser = await contractInstance.isSuperUser(bob);

      expect(isBobSuperUser).equal(true);
    });

    it('should not be able set superUser role for user from not a superUser', async () => {
      await expectRevert(
        contractInstance.setSuperUserRole(bob, true, { from: cale }),
        'Only for super user',
      );
    });

    it('should be able to delete superUser role for user', async () => {
      await contractInstance.setSuperUserRole(bob, true, { from: alice });
      const isBobSuperUser = await contractInstance.isSuperUser(bob);
      expect(isBobSuperUser).equal(true);

      await contractInstance.setSuperUserRole(alice, false, { from: bob });
      const isAliceSuperUser = await contractInstance.isSuperUser(alice);
      expect(isAliceSuperUser).equal(false);
    });
  });

  context('test mint', () => {
    it('should set mint role for user from a superUser', async () => {
      await contractInstance.setMinterRole(bob, true, { from: alice });
      const isBobMinter = await contractInstance.isMinter(bob);

      expect(isBobMinter).equal(true);
    });

    it('should not set mint role for user from not a superUser', async () => {
      await expectRevert(
        contractInstance.setMinterRole(alice, true, { from: bob }),
        'Only for super user',
      );
    });

    it('should not set role for already minter', async () => {
      await contractInstance.setMinterRole(alice, true, { from: alice });
      await expectRevert(
        contractInstance.setMinterRole(alice, true, { from: alice }),
        'Same minter value in storage',
      );
    });

    it('should mint for minter role', async () => {
      await contractInstance.setMinterRole(bob, true, { from: alice });
      await contractInstance.mint(bob, ONE, { from: bob });
      const bobBalance = await contractInstance.balanceOf(bob);

      expect(bobBalance).bignumber.equal(ONE);
    });
  });
});
