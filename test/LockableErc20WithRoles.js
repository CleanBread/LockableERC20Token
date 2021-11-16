const LockableERC20WithRoles = artifacts.require('LockableERC20WithRoles');
const { time, BN, expectRevert } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const keccak256 = require('keccak256');

contract('LockableERC20WithRoles', ([alice, bob, cale]) => {
  const ONE = new BN('10000000000');
  const TWO = new BN('20000000000');
  const DAY = new BN(86400);

  const SUPER_USER_ROLE = keccak256('SUPER_USER_ROLE');
  const MINTER_ROLE = keccak256('MINTER_ROLE');
  const LOCKER_ROLE = keccak256('LOCKER_ROLE');

  const SUPER_USER_ROLE_HEX = '0x' + SUPER_USER_ROLE.toString('hex');
  const MINTER_ROLE_HEX = '0x' + MINTER_ROLE.toString('hex');
  const LOCKER_ROLE_HEX = '0x' + LOCKER_ROLE.toString('hex');

  let contractInstance;
  beforeEach(async () => {
    contractInstance = await LockableERC20WithRoles.new({
      from: alice,
    });
  });

  context('test superUser', () => {
    it('should be able to set superUser role for user from another superUser', async () => {
      await contractInstance.grantRole(SUPER_USER_ROLE, bob, { from: alice });
      const isBobSuperUser = await contractInstance.hasRole(
        SUPER_USER_ROLE,
        bob,
      );

      expect(isBobSuperUser).equal(true);
    });

    it('should not be able set superUser role for user from not a superUser', async () => {
      await expectRevert(
        contractInstance.grantRole(SUPER_USER_ROLE, bob, { from: cale }),
        `AccessControl: account ${cale.toLowerCase()} is missing role ${SUPER_USER_ROLE_HEX}.`,
      );
    });

    it('should be able to delete superUser role for user', async () => {
      await contractInstance.grantRole(SUPER_USER_ROLE, bob, { from: alice });
      const isBobSuperUser = await contractInstance.hasRole(
        SUPER_USER_ROLE,
        bob,
      );
      expect(isBobSuperUser).equal(true);

      await contractInstance.revokeRole(SUPER_USER_ROLE, alice, { from: bob });
      const isAliceSuperUser = await contractInstance.hasRole(
        SUPER_USER_ROLE,
        alice,
      );
      expect(isAliceSuperUser).equal(false);
    });
  });

  context('test lock', () => {
    it('should be able to lock only for locker role', async () => {
      await contractInstance.grantRole(LOCKER_ROLE, bob, { from: alice });
      await contractInstance.mint(alice, ONE, { from: alice });
      await contractInstance.lock(alice, ONE, DAY, {
        from: bob,
      });

      const lockTokens = await contractInstance.getLockValue(alice);

      expect(lockTokens).bignumber.equal(ONE);
    });

    it('should not be able to lock for not a locker role', async () => {
      await expectRevert(
        contractInstance.lock(alice, ONE, DAY, { from: bob }),
        `AccessControl: account ${bob.toLowerCase()} is missing role ${LOCKER_ROLE_HEX}.`,
      );
    });

    it('should not be to able burn more than locked tokens', async () => {
      await contractInstance.mint(alice, ONE, { from: alice });
      await contractInstance.lock(alice, ONE, DAY, {
        from: alice,
      });

      await expectRevert(
        contractInstance.burn(ONE, { from: alice }),
        'Amount greater then available balance',
      );
    });

    it('should be able to burn less than locked tokens', async () => {
      await contractInstance.mint(alice, TWO, { from: alice });
      await contractInstance.lock(alice, ONE, DAY, {
        from: alice,
      });
      await contractInstance.burn(ONE, { from: alice });
      const aliceBalance = await contractInstance.balanceOf(alice);

      expect(aliceBalance).bignumber.equal(TWO.sub(ONE));
    });

    it('should be able to burn all balance after unlock time', async () => {
      await contractInstance.mint(alice, TWO, { from: alice });
      await contractInstance.lock(alice, ONE, DAY, {
        from: alice,
      });
      await time.increase(DAY);
      await contractInstance.burn(TWO, { from: alice });
      const aliceBalance = await contractInstance.balanceOf(alice);

      expect(aliceBalance).bignumber.equal(new BN(0));
    });
  });

  context('test mint', () => {
    it('should set mint role for user from a superUser', async () => {
      await contractInstance.grantRole(MINTER_ROLE, bob, { from: alice });
      const isBobMinter = await contractInstance.hasRole(MINTER_ROLE, bob);

      expect(isBobMinter).equal(true);
    });

    it('should not set mint role for user from not a superUser', async () => {
      await expectRevert(
        contractInstance.grantRole(MINTER_ROLE, alice, { from: cale }),
        `AccessControl: account ${cale.toLowerCase()} is missing role ${SUPER_USER_ROLE_HEX}.`,
      );
    });

    it('should not be able to mint for not minter role', async () => {
      await expectRevert(
        contractInstance.mint(bob, ONE, { from: bob }),
        `AccessControl: account ${bob.toLowerCase()} is missing role ${MINTER_ROLE_HEX}.`,
      );
    });

    it('should mint for minter role', async () => {
      await contractInstance.grantRole(MINTER_ROLE, bob, { from: alice });
      await contractInstance.mint(bob, ONE, { from: bob });
      const bobBalance = await contractInstance.balanceOf(bob);

      expect(bobBalance).bignumber.equal(ONE);
    });
  });
});
