<!DOCTYPE html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <style>
        li {listt-style: none;}
        </style>
    </head>

<body>
<h2>Taskmaster Registration Form</h2>
    <ul>
    <form name="insert" action="insert.php" method="POST" >
        <li>First name:<input type="text" name="firstName" /> </li>
        <li>Last Name:<input type="text" name="lastName" /> </li>
        <li>Email:<input type="text" name="email" /> </li>
        <li>Phone Number:<input type="text" name="number" /> </li>
        <li>Address:<input type="text" name="address" /> </li>
        <li><input type="submit" /></li>
    </form>
    </ul>
</body>

</html>
    
<?php
    $db = pg_connect("host=localhost port=5432 dbname=postgres user=postgres password=Yexin2210@");
    $query = "INSERT INTO users VALUES ('$_POST[userID]', '$_POST[firstName]', '$_POST[lastName]',
    '$_POST[email]','$_POST[number]', '$_POST[address]')";
    $result = pg_query($query); 
?>