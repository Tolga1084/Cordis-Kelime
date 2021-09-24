// Javascript program to implement Binary Search for strings
 
// Returns index of x if it is present in arr[],
// else return -1
function binarySearch(arr,x)
{
    let l = 0, r = arr.length - 1;
        while (l <= r) {
            let m = l + Math.floor((r - l) / 2);
   
            let res = x.localeCompare(arr[m]);
               
            // Check if x is present at mid
            if (res == 0)
                return m;
   
            // If x greater, ignore left half
            if (res > 0)
                l = m + 1;
   
            // If x is smaller, ignore right half
            else
                r = m - 1;
        }
   
        return -1;
}
 
// Driver method to test above
let arr=["contribute", "geeks", "ide", "practice"];
let x = "ide";
let result = binarySearch(arr, x);
if (result == -1)
    document.write("Element not present<br>");
else
    document.write("Element found at "
                   + "index " + result+"<br>");