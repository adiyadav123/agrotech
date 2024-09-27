import React from 'react'
import "../app/globals.css";
import { UserButton } from "@clerk/nextjs";

const Navbar = () => {
  return (
    <div className='nav'>
        <h1>Agrotech</h1>
        <div className=' flex flex-row'>
        <div className=' w-[10px]'></div>
        <UserButton />
        </div>
    </div>
  )
}

export default Navbar;