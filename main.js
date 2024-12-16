import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.7.0/ethers.min.js";
import { abiToken, abiSimpleDEX } from "./abis.js";

let provider, signer, address, decimalsTokenA, decimalsTokenB, 
formattedTokenABalance, formattedTokenBBalance, 
contractTokenA, contractTokenB, contractSimpleDEX;

const TOKEN_A_ADDRESS = "0x4143C6CE604bCB0249CDb8aF5A46867374B3Bf8F";
const TOKEN_B_ADDRESS = "0xf28a5786341F8f69b72907Edd5D22f974B8CC106";
const SIMPLE_DEX_ADDRESS = "0x89Ac0c9163ba78d25f56d7382011238a4cD28555";

async function reloadBalances() {
    const tokenABalance = await contractTokenA.balanceOf(address);
    const tokenBBalance = await contractTokenB.balanceOf(address);
    formattedTokenABalance = ethers.formatUnits(tokenABalance, decimalsTokenA);
    formattedTokenBBalance = ethers.formatUnits(tokenBBalance, decimalsTokenB);

    document.getElementById('tknABalance').innerText = `Balance TKA: ${formattedTokenABalance}`;
    document.getElementById('tknBBalance').innerText = `Balance TKB: ${formattedTokenBBalance}`;
}

async function connectWallet() {
    // Verifica si hay una wallet disponible en el navegador
    if (window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        address = await signer.getAddress();

        contractTokenA = new ethers.Contract(TOKEN_A_ADDRESS, abiToken, signer);
        contractTokenB = new ethers.Contract(TOKEN_B_ADDRESS, abiToken, signer);
        contractSimpleDEX = new ethers.Contract(SIMPLE_DEX_ADDRESS, abiSimpleDEX, signer);
        decimalsTokenA = await contractTokenA.decimals();
        decimalsTokenB = await contractTokenB.decimals();

        await reloadBalances();

        document.getElementById('btnConnect').style.display = 'none';
        document.getElementById('btnDisconnect').style.display = 'inline';
        document.getElementById('status').innerText = `Estado: Conectado a la cuenta ${address}`;
        document.getElementById('tknABalance').style.display = 'block';
        document.getElementById('tknBBalance').style.display = 'block';
        document.getElementById('addLiquidityFields').style.display = 'block';
        document.getElementById('swapTokensFields').style.display = 'block';
        document.getElementById('removeLiquidityFields').style.display = 'block';
        document.getElementById('getPriceFields').style.display = 'block';
    }
    else {
        alert('ERROR: No se detectó ninguna wallet');
    }
}

async function disconnectWallet() {
    provider = null;
    signer = null;
    address = null;
    formattedTokenABalance = 0;
    formattedTokenBBalance = 0;

    document.getElementById('status').innerText = "Estado: Desconectado";
    document.getElementById('btnConnect').style.display = 'inline';
    document.getElementById('btnDisconnect').style.display = 'none';
    document.getElementById('tknABalance').style.display = 'none';
    document.getElementById('tknBBalance').style.display = 'none';
    document.getElementById('addLiquidityFields').style.display = 'none';
    document.getElementById('swapTokensFields').style.display = 'none';
    document.getElementById('removeLiquidityFields').style.display = 'none';
    document.getElementById('getPriceFields').style.display = 'none';
    document.getElementById('tknPrice').style.display = 'none';
}

async function addLiquidity() {
    const amountA = document.getElementById('tokenAAmountToAdd').value;
    const amountB = document.getElementById('tokenBAmountToAdd').value;

    if (isNaN(amountA) || amountA <= 0 || isNaN(amountB) || amountB <= 0) {
        alert("Debe ingresar montos válidos");
        return;
    }

    if (parseFloat(amountA) > parseFloat(formattedTokenABalance) || parseFloat(amountB) > parseFloat(formattedTokenBBalance)) {
        alert("No tiene fondos suficientes");
        return;
    }

    try {
        const amountAToSend = ethers.parseUnits(amountA, decimalsTokenA);
        const amountBToSend = ethers.parseUnits(amountB, decimalsTokenB);

        const txApprovalA = await contractTokenA.approve(SIMPLE_DEX_ADDRESS, amountAToSend);
        const txApprovalB = await contractTokenB.approve(SIMPLE_DEX_ADDRESS, amountBToSend);
        await txApprovalA.wait();
        await txApprovalB.wait();

        const tx = await contractSimpleDEX.addLiquidity(amountAToSend, amountBToSend);
        await tx.wait();
        await reloadBalances();

        alert(`Liquidez agregada exitosamente: ${tx.hash}`);
    } catch (error) {
        console.error('Error adding liquidity', error);
        alert('Error al agregar liquidez', error?.data?.message);
    }
}

async function removeLiquidity() {
    const amountA = document.getElementById('tokenAAmountToRemove').value;
    const amountB = document.getElementById('tokenBAmountToRemove').value;

    if (isNaN(amountA) || amountA < 0 || isNaN(amountB) || amountB < 0) {
        alert("Debe ingresar montos válidos");
        return;
    }

    try {
        const amountAToRemove = ethers.parseUnits(amountA, decimalsTokenA);
        const amountBToRemove = ethers.parseUnits(amountB, decimalsTokenB);

        const tx = await contractSimpleDEX.removeLiquidity(amountAToRemove, amountBToRemove);
        await tx.wait();
        await reloadBalances();

        alert(`Liquidez retirada exitosamente: ${tx.hash}`);
    } catch (error) {
        console.error('Error removing liquidity', error);
        alert('Error al retirar liquidez', error?.data?.message);
    }
}

async function swapTokens() {
    const amount = document.getElementById('amountToSwap').value;
    const tokenSeleccionado = document.getElementById('tokenToSwap').value;
    const formattedBalance = (tokenSeleccionado == 'tka') ? formattedTokenABalance : formattedTokenBBalance;

    if (isNaN(amount) || amount <= 0) {
        alert("Debe ingresar un monto válido");
        return;
    }

    if (amount > formattedBalance) {
        alert("No tiene fondos suficientes");
        return;
    }

    try {
        const decimals = (tokenSeleccionado == 'tka') ? decimalsTokenA : decimalsTokenB;
        const amountToSwap = ethers.parseUnits(amount, decimals);

        const txApproval = (tokenSeleccionado == 'tka') ? await contractTokenA.approve(SIMPLE_DEX_ADDRESS, amountToSwap) : await contractTokenB.approve(SIMPLE_DEX_ADDRESS, amountToSwap);
        await txApproval.wait();

        const tx = (tokenSeleccionado == 'tka') ? await contractSimpleDEX.swapAforB(amountToSwap) : await contractSimpleDEX.swapBforA(amountToSwap);
        await tx.wait();
        await reloadBalances();

        alert(`Tokens intercambiados exitosamente: ${tx.hash}`);
    } catch (error) {
        console.error('Error swapping tokens', error);
        alert('Error al intercambiar tokens', error?.data?.message);
    }
}

async function getPrice() {
    const tokenSeleccionado = document.getElementById('tokenToGetPrice').value;
    const tokenNoSeleccionado = (tokenSeleccionado == 'TKA') ? 'TKB' : 'TKA';
    const addressToConsult = (tokenSeleccionado == 'TKA') ? TOKEN_A_ADDRESS : TOKEN_B_ADDRESS;

    try {
        const value = await contractSimpleDEX.getPrice(addressToConsult);
        const decimals = (tokenSeleccionado == 'TKA') ? decimalsTokenA : decimalsTokenB;
        const formattedValue = ethers.formatUnits(value, decimals);

        document.getElementById('tknPrice').innerText = `1.0 ${tokenSeleccionado} = ${formattedValue} ${tokenNoSeleccionado}`;
        document.getElementById('tknPrice').style.display = 'block';
    } catch (error) {
        console.error('Error getting price', error);
        alert('Error al consultar el precio', error?.data?.message);
    }
}

document.getElementById('btnConnect').addEventListener('click', connectWallet);
document.getElementById('btnDisconnect').addEventListener('click', disconnectWallet);
document.getElementById('btnAddLiquidity').addEventListener('click', addLiquidity);
document.getElementById('btnRemoveLiquidity').addEventListener('click', removeLiquidity);
document.getElementById('btnSwapTokens').addEventListener('click', swapTokens);
document.getElementById('btnGetPrice').addEventListener('click', getPrice);
